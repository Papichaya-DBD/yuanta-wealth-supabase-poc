alter table weekly_market_calendar enable row level security;

create policy "public read access"
  on weekly_market_calendar
  for select
  to anon, authenticated
  using (true);
