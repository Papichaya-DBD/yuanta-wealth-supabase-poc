create table if not exists weekly_market_calendar (
  hs_id bigint primary key,
  hs_path text,
  hs_created_at timestamptz,
  hs_name text,
  hs_child_table_id bigint,
  hs_updated_at timestamptz,
  week_slug text unique not null,
  main_title text,
  page_subtitle text,
  page_date date,
  week_start_date date,
  week_end_date date,
  cover_image text,
  description text,
  ai_summary text,
  body text
);

create index if not exists weekly_market_calendar_week_slug_idx on weekly_market_calendar (week_slug);
