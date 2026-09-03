#!/usr/bin/env python3
"""
One-time migration: copy every image/PDF file this PoC still references from
HubSpot's CDN (hubspotusercontent-na2.net) into Supabase Storage, then update
every row's jsonb (or legacy text) field so the url points at Supabase instead.

Why this exists: migrating the DATA (HubDB -> Supabase tables) was done earlier
in this project, but the image/file fields only ever stored {id, url, type}
JSON pointing back at HubSpot's own file host -- the actual files were never
copied. If HubSpot access is ever revoked, every image and PDF in this PoC
would 404 even though the row text data lives entirely in Supabase. This
script closes that gap.

Run it yourself -- it needs your project's service_role key, which must never
be pasted into a chat or committed to this repo:

    export SUPABASE_SERVICE_ROLE_KEY="<Project Settings -> API -> service_role>"
    python3 migrate_assets_to_storage.py

Safe to re-run: already-migrated rows (url already points at Supabase Storage)
and already-uploaded files (same derived storage path) are skipped.
"""
import hashlib
import json
import mimetypes
import os
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

# (table, id_column, field_column, is_jsonb)
# is_jsonb=False is the one legacy field stored as a raw HubDB-style string
# "url,width,height,alt,fileId" instead of a clean jsonb object.
TARGETS = [
    ("weekly_hot_issue", "id", "cover_image", True),
    ("weekly_asset_performance", "id", "cover_image", True),
    ("weekly_market_calendar", "hs_id", "cover_image", False),
    ("monthly_hot_issue", "id", "cover_image", True),
    ("monthly_asset_performance", "id", "cover_image", True),
    ("monthly_market_outlook", "id", "cover_image", True),
    ("monthly_market_calendar", "id", "cover_image", True),
    ("monthly_asset_class_outlook", "id", "cover_image", True),
    ("weekly_buy_list", "id", "cover_image", True),
    ("monthly_buy_list", "id", "cover_image", True),
    ("experts", "id", "photo", True),
    ("blog_general", "id", "thumbnail", True),
    ("weekly_pdf", "id", "pdf_url", True),
    ("monthly_pdf", "id", "pdf_url", True),
]

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
}


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
        if e.code == 400 and b"already exists" in e.read():
            print(f"Bucket '{BUCKET}' already exists, continuing")
        else:
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
    """Download old_url once, upload to Storage, return (new_url) — memoised in cache."""
    if old_url in cache:
        return cache[old_url]
    if old_url.startswith(SUPABASE_URL):
        cache[old_url] = old_url  # already migrated
        return old_url

    path = storage_path_for(old_url)
    print(f"  downloading  {old_url}")
    try:
        dl_req = urllib.request.Request(old_url, headers={"User-Agent": "Mozilla/5.0 (migration script)"})
        with urllib.request.urlopen(dl_req) as r:
            data = r.read()
    except urllib.error.HTTPError as e:
        print(f"    !! failed to download ({e.code}), skipping this file")
        cache[old_url] = old_url
        return old_url

    content_type = guess_content_type(path)
    print(f"  uploading    -> {BUCKET}/{path}  ({len(data)} bytes, {content_type})")
    upload_file(path, data, content_type)

    new_url = public_url_for(path)
    cache[old_url] = new_url
    return new_url


def parse_legacy_text_field(raw):
    """weekly_market_calendar.cover_image: 'url,width,height,alt,fileId' (or just a bare url)."""
    parts = raw.split(",", 1)
    return parts[0], (parts[1] if len(parts) > 1 else "")


def main():
    ensure_bucket()
    url_cache = {}
    total_rows_updated = 0

    for table, id_col, field, is_jsonb in TARGETS:
        rows = api_get(f"/rest/v1/{table}?select={id_col},{field}")
        print(f"\n== {table}.{field} ({len(rows)} rows) ==")
        for row in rows:
            row_id = row[id_col]
            value = row.get(field)
            if not value:
                continue

            if is_jsonb:
                old_url = value.get("url")
                if not old_url or old_url.startswith(SUPABASE_URL):
                    continue
                new_url = migrate_one(old_url, url_cache)
                if new_url == old_url:
                    continue
                new_value = {**value, "url": new_url}
            else:
                old_url, rest = parse_legacy_text_field(value)
                if not old_url or old_url.startswith(SUPABASE_URL):
                    continue
                new_url = migrate_one(old_url, url_cache)
                if new_url == old_url:
                    continue
                new_value = f"{new_url},{rest}" if rest else new_url

            api_patch(table, row_id, id_col, {field: new_value})
            total_rows_updated += 1
            print(f"    row {row_id}: updated")

    unique_files = sum(1 for k, v in url_cache.items() if v != k)
    print(f"\nDone. {unique_files} unique files migrated to Supabase Storage, "
          f"{total_rows_updated} rows updated across {len(TARGETS)} table/column pairs.")


if __name__ == "__main__":
    main()
