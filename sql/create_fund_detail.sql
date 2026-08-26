create table if not exists "fund_detail" (
  id bigserial primary key,
  path text,
  hs_name text,
  "ticker" text,
  "fund_name" text,
  "fund_type" text,
  "ai_summary" text,
  "content" text
);
create index if not exists fund_detail_ticker_idx on "fund_detail" (ticker);
alter table "fund_detail" enable row level security;
create policy "public read access" on "fund_detail" for select to anon, authenticated using (true);
