#!/usr/bin/env python3
"""
One-time migration: rewrite every HubSpot CDN image URL embedded INLINE inside
rich-text fields (body / ai_summary / description / content / cio_content /
conditions*) so it points at Supabase Storage instead.

Why this exists: migrate_assets_to_storage.py already moved the dedicated
image/PDF fields (cover_image, photo, thumbnail, pdf_url) to Supabase Storage.
But every article's rich-text body still has its own inline <img> tags
(mostly report-page screenshots: .../weekly-reports/.../page_NN.png) pointing
straight at HubSpot's file host. If HubSpot is shut down, those images would
404 even though the article text itself lives in Supabase. This script closes
that last gap.

Run it yourself -- it needs your project's service_role key, which must never
be pasted into a chat or committed to this repo:

    export SUPABASE_SERVICE_ROLE_KEY="<Project Settings -> API -> service_role>"
    python3 migrate_inline_images_to_storage.py

Safe to re-run: URLs already pointing at Supabase Storage are left alone, and
already-uploaded files (same derived storage path) are just re-used.
"""
import hashlib
import json
import mimetypes
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

SUPABASE_URL = "https://kqgdvpqygepvaifzrxki.supabase.co"
BUCKET = "wealth-assets"
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SERVICE_ROLE_KEY:
    sys.exit(
        "Missing SUPABASE_SERVICE_ROLE_KEY.\n"
        "Get it from the Supabase dashboard: Project Settings -> API -> service_role\n"
        "Then: export SUPABASE_SERVICE_ROLE_KEY=\"...\"  (never commit or paste this key)"
    )

# (table, id_column, [text columns to scan])
# Every text/rich-text column in the schema is listed here, even ones that
# turned out to have zero HubSpot image references today -- cheap to scan,
# and it means this script doesn't silently miss a table if content changes.
TARGETS = [
    ("weekly_market_calendar", "hs_id", ["body", "ai_summary", "description"]),
    ("monthly_asset_class_outlook", "id", ["body", "ai_summary", "description"]),
    ("monthly_asset_performance", "id", ["body", "ai_summary", "description"]),
    ("monthly_buy_list", "id", ["cio_content", "description"]),
    ("monthly_hot_issue", "id", ["body", "ai_summary", "description"]),
    ("monthly_market_calendar", "id", ["body", "ai_summary", "description"]),
    ("monthly_market_outlook", "id", ["body", "ai_summary", "description"]),
    ("preview_asset_class_outlook", "id", ["body", "ai_summary", "description"]),
    ("preview_hot_issue", "id", ["body", "ai_summary", "description"]),
    ("weekly_asset_performance", "id", ["body", "ai_summary", "description"]),
    ("weekly_buy_list", "id", ["cio_content", "description"]),
    ("weekly_hot_issue", "id", ["body", "ai_summary", "description"]),
    ("fund_detail", "id", ["ai_summary", "content"]),
    ("blog_general", "id", ["content", "conditions", "conditions_1", "conditions_2"]),
    ("events", "id", ["body"]),
]

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
}

URL_PATTERN = re.compile(r"""https?://[^\s"'<>)]+(?:hubfs|hubspotusercontent|hs-fs)[^\s"'<>)]*""")


def api_get(path):
    req = urllib.request.Request(SUPABASE_URL + path, headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def api_patch(table, row_id, id_col, body):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{id_col}=eq.{row_id}"
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="PATCH", headers={
        **HEADERS,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    with urllib.request.urlopen(req) as r:
        r.read()


def ensure_bucket():
    get_req = urllib.request.Request(f"{SUPABASE_URL}/storage/v1/bucket/{BUCKET}", headers=HEADERS)
    try:
        urllib.request.urlopen(get_req)
        print(f"Bucket '{BUCKET}' already exists, continuing")
        return
    except urllib.error.HTTPError as e:
        if e.code != 404:
            print(f"  (bucket lookup returned {e.code}, attempting create anyway)")

    req = urllib.request.Request(
        f"{SUPABASE_URL}/storage/v1/bucket",
        data=json.dumps({"id": BUCKET, "name": BUCKET, "public": True}).encode(),
        method="POST",
        headers={**HEADERS, "Content-Type": "application/json"},
    )
    try:
        urllib.request.urlopen(req)
        print(f"Created bucket '{BUCKET}'")
    except urllib.error.HTTPError as e:
        body = e.read()
        if e.code == 400 and b"exist" in body.lower():
            print(f"Bucket '{BUCKET}' already exists, continuing")
        else:
            print(f"  !! bucket create failed ({e.code}): {body.decode(errors='replace')}")
            raise


def ascii_safe_segment(segment):
    """Supabase Storage rejects non-ASCII bytes in an object key with a 400
    InvalidKey error (percent-encoding doesn't help -- the server decodes the
    URL path before validating the key). Replace any such segment with a
    stable ascii slug derived from its content, keeping the extension."""
    if segment.isascii():
        return segment
    base, dot, ext = segment.rpartition(".")
    digest = hashlib.sha1(segment.encode("utf-8")).hexdigest()[:10]
    return f"asset-{digest}.{ext}" if dot and ext.isascii() else f"asset-{digest}"


def storage_path_for(url):
    """Derive a stable, traceable storage path from a HubSpot hubfs URL."""
    parsed = urllib.parse.urlparse(url)
    path = urllib.parse.unquote(parsed.path)
    marker = "/hubfs/"
    idx = path.find(marker)
    if idx != -1:
        path = path[idx + len(marker):]
        # first path segment after /hubfs/ is the HubSpot portal id -- drop it
        parts = path.split("/", 1)
        path = parts[1] if len(parts) > 1 else parts[0]
    else:
        path = path.lstrip("/")
    return "/".join(ascii_safe_segment(p) for p in path.split("/"))


def guess_content_type(path):
    ctype, _ = mimetypes.guess_type(path)
    return ctype or "application/octet-stream"


def upload_file(path, data, content_type):
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{urllib.parse.quote(path)}"
    req = urllib.request.Request(url, data=data, method="POST", headers={
        **HEADERS,
        "Content-Type": content_type,
        "x-upsert": "true",
    })
    urllib.request.urlopen(req).read()


def public_url_for(path):
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{urllib.parse.quote(path)}"


def migrate_one(old_url, cache):
    """Download old_url once, upload to Storage, return new_url -- memoised in cache."""
    if old_url in cache:
        return cache[old_url]
    if old_url.startswith(SUPABASE_URL):
        cache[old_url] = old_url
        return old_url

    path = storage_path_for(old_url)
    print(f"  downloading  {old_url}")
    try:
        dl_req = urllib.request.Request(old_url, headers={"User-Agent": "Mozilla/5.0 (migration script)"})
        with urllib.request.urlopen(dl_req) as r:
            data = r.read()
    except urllib.error.HTTPError as e:
        print(f"    !! failed to download ({e.code}), leaving this URL as-is")
        cache[old_url] = old_url
        return old_url

    content_type = guess_content_type(path)
    print(f"  uploading    -> {BUCKET}/{path}  ({len(data)} bytes, {content_type})")
    upload_file(path, data, content_type)

    new_url = public_url_for(path)
    cache[old_url] = new_url
    return new_url


def main():
    ensure_bucket()
    url_cache = {}
    total_rows_updated = 0
    total_replacements = 0

    for table, id_col, columns in TARGETS:
        select = f"{id_col}," + ",".join(columns)
        rows = api_get(f"/rest/v1/{table}?select={select}")
        print(f"\n== {table} ({len(rows)} rows, columns: {', '.join(columns)}) ==")
        for row in rows:
            row_id = row[id_col]
            patch = {}
            for col in columns:
                text = row.get(col)
                if not text:
                    continue
                urls = set(URL_PATTERN.findall(text))
                if not urls:
                    continue
                new_text = text
                changed = False
                for old_url in urls:
                    new_url = migrate_one(old_url, url_cache)
                    if new_url != old_url:
                        new_text = new_text.replace(old_url, new_url)
                        changed = True
                        total_replacements += 1
                if changed:
                    patch[col] = new_text
            if patch:
                api_patch(table, row_id, id_col, patch)
                total_rows_updated += 1
                print(f"    row {row_id}: updated columns {list(patch.keys())}")

    unique_files = sum(1 for k, v in url_cache.items() if v != k)
    print(f"\nDone. {unique_files} unique inline images migrated to Supabase Storage, "
          f"{total_replacements} URL replacements across {total_rows_updated} rows.")


if __name__ == "__main__":
    main()
