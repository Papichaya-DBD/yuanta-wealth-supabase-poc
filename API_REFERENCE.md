# Yuanta Wealth — Supabase API Reference

This is the REST API for the Supabase PoC that mirrors Yuanta Wealth's HubDB tables. It's a
**public, read-only, auto-generated REST API** (PostgREST, provided by Supabase) — every table
listed below is queryable directly over HTTPS with no backend code needed. This doc is written so
someone outside this project can pick it up and start pulling real data immediately.

> **Status: Proof-of-concept only.** This is a sandboxed evaluation project, isolated from
> production HubSpot/HubDB. Data here is a snapshot, not live-synced.

---

## 1. Base URL & Auth

```
Base URL:  https://kqgdvpqygepvaifzrxki.supabase.co/rest/v1/
```

Every request needs two headers — a publishable ("anon") key, safe to use in client-side code
(browser JS, mobile apps). Row-Level Security is enabled on every table with a public **read-only**
policy, so this key can `SELECT` but never `INSERT`/`UPDATE`/`DELETE`.

```
apikey: sb_publishable_6khmxt87r-YGlSxyF9d9XA_G0NNDTbp
Authorization: Bearer sb_publishable_6khmxt87r-YGlSxyF9d9XA_G0NNDTbp
```

**curl example:**
```bash
curl "https://kqgdvpqygepvaifzrxki.supabase.co/rest/v1/weekly_hot_issue?select=main_title,page_date&limit=3" \
  -H "apikey: sb_publishable_6khmxt87r-YGlSxyF9d9XA_G0NNDTbp" \
  -H "Authorization: Bearer sb_publishable_6khmxt87r-YGlSxyF9d9XA_G0NNDTbp"
```

**JavaScript (browser) example:**
```js
fetch('https://kqgdvpqygepvaifzrxki.supabase.co/rest/v1/weekly_hot_issue?select=main_title,page_date&limit=3', {
  headers: {
    apikey: 'sb_publishable_6khmxt87r-YGlSxyF9d9XA_G0NNDTbp',
    Authorization: 'Bearer sb_publishable_6khmxt87r-YGlSxyF9d9XA_G0NNDTbp',
  },
}).then(r => r.json()).then(console.log);
```

---

## 2. Query syntax cheatsheet (PostgREST)

Every table endpoint (`/rest/v1/<table>`) accepts these query-string operators. Combine them
freely with `&`.

| Need | Syntax | Example |
|---|---|---|
| Pick columns | `select=col1,col2` | `?select=main_title,page_date` |
| Pick all columns | `select=*` (or omit `select`) | `?select=*` |
| Filter: equals | `col=eq.value` | `?week_slug=eq.2026-07-01` |
| Filter: not equal | `col=neq.value` | `?path=neq.2026-07-01-equity` |
| Filter: greater/less than | `col=gt.value` / `col=lt.value` | `?page_date=gt.2026-01-01` |
| Filter: in a list | `col=in.(a,b,c)` | `?model=in.(defender,growth)` |
| Sort | `order=col.asc` / `order=col.desc` | `?order=page_date.desc` |
| Limit rows | `limit=N` | `?limit=10` |
| Skip rows (pagination) | `offset=N` | `?limit=10&offset=10` |
| Combine filters (AND) | just chain with `&` | `?week_slug=eq.2026-07-01&limit=5` |

Dates (`date` columns) are plain ISO strings (`"2026-07-01"`), not epoch milliseconds — this is a
difference from raw HubDB row JSON, where dates are epoch-ms.

Full PostgREST reference: https://docs.postgrest.org/en/stable/references/api/tables_views.html

---

## 3. Row-identity conventions

Two different content shapes exist across these tables — this determines how you look up "the one
row for this page":

- **Single-per-period tables** (e.g. `weekly_market_calendar`, `monthly_market_outlook`): one row
  per `week_slug`. Look up with `?week_slug=eq.<date>`.
- **Split tables** (e.g. `weekly_hot_issue`, `monthly_hot_issue`, `monthly_asset_class_outlook`):
  **multiple** topic rows can share one `week_slug` (one publish cycle covers several articles).
  Each row's unique identity is its `path` column (mirrors HubDB's `hs_path`) — look up a specific
  article with `?path=eq.<slug>`, or list every topic in a period with `?week_slug=eq.<date>`.

`week_slug` values are the **first day of the period**: `YYYY-MM-DD` for a week's Monday, or
`YYYY-MM-01` for a month.

---

## 4. Tables

### Weekly content

#### `weekly_hot_issue` — *split table*
Weekly "what's happening in markets" articles. Multiple topics per week.
| Column | Type | Notes |
|---|---|---|
| `path` | text | unique row id, e.g. `2026-06-15-fed-rate-decision` |
| `week_slug` | text | e.g. `2026-06-15` |
| `main_title`, `page_subtitle`, `sub_title` | text | |
| `page_date` | date | |
| `description` | text | short excerpt (falls back to stripped `ai_summary` if empty) |
| `ai_summary` | text | HTML |
| `body` | text | HTML, full article |
| `cover_image` | jsonb | `{id, url, type}` |

```bash
# All topics published in the week of 2026-06-15
curl ".../weekly_hot_issue?select=*&week_slug=eq.2026-06-15" -H "..."
# One specific article
curl ".../weekly_hot_issue?select=*&path=eq.2026-06-15-fed-rate-decision" -H "..."
```

#### `weekly_asset_performance` — one row per week
Weekly asset-class performance recap. `week_slug`, `main_title`, `page_subtitle`, `page_date`,
`description`, `ai_summary`, `body`, `cover_image` (same shape as above).

#### `weekly_buy_list` — 3 rows per week (one per portfolio model)
Weekly recommended portfolio. `model` is `defender` / `flexible` / `growth`.
| Column | Notes |
|---|---|
| `week_slug`, `model` | composite identity — one row per (week, model) |
| `main_title`, `page_subtitle`, `page_date`, `cio_content` | |
| `core_pct`, `satellite_pct` | numeric, portfolio split |
| `gfi_*`, `geq_*` | Core holdings: Global Fixed Income / Global Equity — `_weight`, `_lt_return`, `_target_12m`, `_eps_12m`, `_funds` (comma-separated `TICKER:type` list, type ∈ `mf`/`dr`/`etf`) |
| `sat_1_*` … `sat_8_*` | up to 8 Satellite holdings, same suffix pattern as `gfi_*`/`geq_*`, plus `_sub` and `_name` |
| `perf_lt_return`, `perf_core_return`, `perf_sat_return`, `perf_risk_sd`, `perf_var_95` | headline performance/risk stats |
| `source_text` | footnote/disclaimer text |

```bash
curl ".../weekly_buy_list?select=*&week_slug=eq.2026-06-15&model=eq.defender" -H "..."
```

#### `weekly_market_calendar` — one row per week
Upcoming economic calendar. Same base shape as `weekly_asset_performance` plus `week_start_date`/`week_end_date`.

#### `weekly_pdf` — one row per week
Just a pointer to the published PDF report.
| Column | Notes |
|---|---|
| `week_slug` | |
| `pdf_url` | jsonb `{id, url, type}` — `url` is the direct PDF link |

```bash
curl ".../weekly_pdf?select=week_slug,pdf_url&order=week_slug.desc&limit=1" -H "..."
```

---

### Monthly content

Same shapes as their weekly counterparts, one publish cycle per calendar month
(`week_slug = 'YYYY-MM-01'`):

| Table | Shape | Notes |
|---|---|---|
| `monthly_hot_issue` | split (by `path`) | |
| `monthly_asset_performance` | one row/month | |
| `monthly_market_outlook` | one row/month | |
| `monthly_market_calendar` | one row/month | |
| `monthly_asset_class_outlook` | split (by `path`) | multiple asset-class deep-dives per month, e.g. `2026-07-01-equity`, `2026-07-01-fixed-income`, `2026-07-01-gold`, `2026-07-01-global-fixed-income-portfolio` |
| `monthly_buy_list` | 3 rows/month (by `model`) | same column set as `weekly_buy_list`, but satellite holdings only go up to `sat_8_*` (not 12, despite older front-end code looping to 12 — columns 9–12 simply don't exist here) |
| `monthly_pdf` | one row/month | same shape as `weekly_pdf` |

```bash
# All asset-class-outlook articles for July 2026
curl ".../monthly_asset_class_outlook?select=*&week_slug=eq.2026-07-01" -H "..."
```

---

### Shared reference data

#### `experts` — analyst bios, used on every article page's "บทวิเคราะห์โดย" section
| Column | Notes |
|---|---|
| `name`, `title`, `credentials` | |
| `photo` | jsonb `{id, url, type}` |
| `order` | numeric, sort ascending for display order |

```bash
curl ".../experts?select=*&order=order.asc" -H "..."
```

#### `fund_detail` — lookup by ticker, used by the "recommended fund" drawer on buy-list pages
| Column | Notes |
|---|---|
| `ticker` | e.g. `ACWI`, `UGISFX-N` — **this is the lookup key**, not `id` |
| `fund_name`, `fund_type` (`mf` / `dr` / `etf`) | |
| `ai_summary` | HTML, short AI blurb |
| `content` | HTML, fund highlights/detail |

```bash
curl ".../fund_detail?select=*&ticker=eq.ACWI" -H "..."
```

#### `events` — Privileges & Events listing
`slug`, `title`, `event_date`, `event_time`, `location`, `image` (jsonb), `body` (HTML), `category`,
`is_published` (boolean — filter with `?is_published=eq.true` to match what the live site shows).

#### `blog_general` — generic promo/campaign blog posts
`slug`, `main_campaign`, `campaign_value`, `title`, `thumbnail` (jsonb), `content` (HTML),
`conditions_title`/`conditions` (+ `_1`/`_2` variants for multiple T&C blocks), `cta_label`, `cta_url`.

---

### Internal / not for production consumption

- `preview_hot_issue`, `preview_asset_class_outlook` — pre-publish staging duplicates used by the
  internal editorial workflow before content goes live. Same shape as their real counterparts.
  **Skip these** unless you're specifically building an internal preview tool — they were
  intentionally excluded from the public-facing PoC page clones.

---

## 5. Common patterns

**"Give me the latest published row"** (used throughout the PoC front-end as the no-URL-param default):
```bash
curl ".../weekly_buy_list?select=week_slug&order=week_slug.desc&limit=1" -H "..."
```

**"Give me everything published in one week/month, across categories"** (related-articles pattern —
call each table once, `week_slug=eq.<slug>`, and merge client-side):
```bash
curl ".../weekly_hot_issue?select=*&week_slug=eq.2026-06-15" -H "..."
curl ".../weekly_asset_performance?select=*&week_slug=eq.2026-06-15&limit=1" -H "..."
curl ".../weekly_buy_list?select=*&week_slug=eq.2026-06-15&limit=1" -H "..."
curl ".../weekly_market_calendar?select=*&week_slug=eq.2026-06-15&limit=1" -H "..."
```

**Rendering `ai_summary`/`body`/`content` fields**: these are raw HTML strings (rich text from the
original CMS) — render with `innerHTML`, don't escape them as plain text. If you need a plain-text
excerpt, strip tags client-side (there's no separate plain-text column except `description`, which
is sometimes empty).

---

## 6. Reference implementation

Every query pattern above is exercised in a real working page in this repo — see `sbFetch()` (the
shared fetch helper) and its call sites in any `single-*.html` file, e.g. `single-hot-issue.html`
(split-table lookup), `single-buy-list.html` (multi-model + fund-drawer lookup), or
`single-monthly-buy-list.html` (cross-category related-articles fetch).
