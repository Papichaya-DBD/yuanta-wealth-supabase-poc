create table if not exists "events" (
  id bigserial primary key,
  path text,
  hs_name text,
  "slug" text,
  "title" text,
  "event_date" date,
  "event_time" text,
  "location" text,
  "image" jsonb,
  "body" text,
  "category" text,
  "is_published" boolean
);

create index if not exists events_slug_idx on "events" (slug);

create table if not exists "experts" (
  id bigserial primary key,
  path text,
  hs_name text,
  "name" text,
  "photo" jsonb,
  "title" text,
  "credentials" text,
  "order" numeric
);

create table if not exists "monthly_asset_class_outlook" (
  id bigserial primary key,
  path text,
  hs_name text,
  "week_slug" text,
  "main_title" text,
  "page_subtitle" text,
  "sub_title" text,
  "page_date" date,
  "week_start_date" date,
  "week_end_date" date,
  "cover_image" jsonb,
  "description" text,
  "ai_summary" text,
  "body" text,
  "is_published" boolean
);

create index if not exists monthly_asset_class_outlook_week_slug_idx on "monthly_asset_class_outlook" (week_slug);

create table if not exists "monthly_asset_performance" (
  id bigserial primary key,
  path text,
  hs_name text,
  "week_slug" text,
  "main_title" text,
  "page_subtitle" text,
  "page_date" date,
  "week_start_date" date,
  "week_end_date" date,
  "cover_image" jsonb,
  "description" text,
  "ai_summary" text,
  "body" text
);

create index if not exists monthly_asset_performance_week_slug_idx on "monthly_asset_performance" (week_slug);

create table if not exists "monthly_buy_list" (
  id bigserial primary key,
  path text,
  hs_name text,
  "week_slug" text,
  "week_start_date" date,
  "week_end_date" date,
  "model" text,
  "main_title" text,
  "page_subtitle" text,
  "page_date" date,
  "cover_image" jsonb,
  "description" text,
  "is_published" boolean,
  "cio_content" text,
  "core_pct" numeric,
  "satellite_pct" numeric,
  "gfi_weight" numeric,
  "gfi_lt_return" text,
  "gfi_target_12m" text,
  "gfi_eps_12m" text,
  "gfi_funds" text,
  "geq_weight" numeric,
  "geq_lt_return" text,
  "geq_target_12m" text,
  "geq_eps_12m" text,
  "geq_funds" text,
  "sat_1_name" text,
  "sat_1_sub" text,
  "sat_1_weight" numeric,
  "sat_1_lt_return" text,
  "sat_1_target_12m" text,
  "sat_1_eps_12m" text,
  "sat_1_funds" text,
  "sat_2_name" text,
  "sat_2_sub" text,
  "sat_2_weight" numeric,
  "sat_2_lt_return" text,
  "sat_2_target_12m" text,
  "sat_2_eps_12m" text,
  "sat_2_funds" text,
  "sat_3_name" text,
  "sat_3_sub" text,
  "sat_3_weight" numeric,
  "sat_3_lt_return" text,
  "sat_3_target_12m" text,
  "sat_3_eps_12m" text,
  "sat_3_funds" text,
  "sat_4_name" text,
  "sat_4_sub" text,
  "sat_4_weight" numeric,
  "sat_4_lt_return" text,
  "sat_4_target_12m" text,
  "sat_4_eps_12m" text,
  "sat_4_funds" text,
  "sat_5_name" text,
  "sat_5_sub" text,
  "sat_5_weight" numeric,
  "sat_5_lt_return" text,
  "sat_5_target_12m" text,
  "sat_5_eps_12m" text,
  "sat_5_funds" text,
  "sat_6_name" text,
  "sat_6_sub" text,
  "sat_6_weight" numeric,
  "sat_6_lt_return" text,
  "sat_6_target_12m" text,
  "sat_6_eps_12m" text,
  "sat_6_funds" text,
  "sat_7_name" text,
  "sat_7_sub" text,
  "sat_7_weight" numeric,
  "sat_7_lt_return" text,
  "sat_7_target_12m" text,
  "sat_7_eps_12m" text,
  "sat_7_funds" text,
  "sat_8_name" text,
  "sat_8_sub" text,
  "sat_8_weight" numeric,
  "sat_8_lt_return" text,
  "sat_8_target_12m" text,
  "sat_8_eps_12m" text,
  "sat_8_funds" text,
  "perf_lt_return" text,
  "perf_core_return" text,
  "perf_sat_return" text,
  "perf_risk_sd" text,
  "perf_var_95" text,
  "source_text" text
);

create index if not exists monthly_buy_list_week_slug_idx on "monthly_buy_list" (week_slug);

create table if not exists "monthly_hot_issue" (
  id bigserial primary key,
  path text,
  hs_name text,
  "week_slug" text,
  "main_title" text,
  "page_subtitle" text,
  "sub_title" text,
  "page_date" date,
  "week_start_date" date,
  "week_end_date" date,
  "cover_image" jsonb,
  "description" text,
  "ai_summary" text,
  "body" text
);

create index if not exists monthly_hot_issue_week_slug_idx on "monthly_hot_issue" (week_slug);

create table if not exists "monthly_market_calendar" (
  id bigserial primary key,
  path text,
  hs_name text,
  "week_slug" text,
  "main_title" text,
  "page_subtitle" text,
  "page_date" date,
  "week_start_date" date,
  "week_end_date" date,
  "cover_image" jsonb,
  "description" text,
  "ai_summary" text,
  "body" text,
  "is_published" boolean
);

create index if not exists monthly_market_calendar_week_slug_idx on "monthly_market_calendar" (week_slug);

create table if not exists "monthly_market_outlook" (
  id bigserial primary key,
  path text,
  hs_name text,
  "week_slug" text,
  "main_title" text,
  "page_subtitle" text,
  "page_date" date,
  "week_start_date" date,
  "week_end_date" date,
  "cover_image" jsonb,
  "description" text,
  "ai_summary" text,
  "body" text
);

create index if not exists monthly_market_outlook_week_slug_idx on "monthly_market_outlook" (week_slug);

create table if not exists "monthly_pdf" (
  id bigserial primary key,
  path text,
  hs_name text,
  "week_slug" text,
  "pdf_url" jsonb
);

create index if not exists monthly_pdf_week_slug_idx on "monthly_pdf" (week_slug);

create table if not exists "preview_asset_class_outlook" (
  id bigserial primary key,
  path text,
  hs_name text,
  "week_slug" text,
  "main_title" text,
  "page_subtitle" text,
  "sub_title" text,
  "page_date" date,
  "week_start_date" date,
  "week_end_date" date,
  "cover_image" jsonb,
  "description" text,
  "ai_summary" text,
  "body" text,
  "is_published" boolean
);

create index if not exists preview_asset_class_outlook_week_slug_idx on "preview_asset_class_outlook" (week_slug);

create table if not exists "preview_hot_issue" (
  id bigserial primary key,
  path text,
  hs_name text,
  "week_slug" text,
  "main_title" text,
  "page_subtitle" text,
  "sub_title" text,
  "page_date" date,
  "week_start_date" date,
  "week_end_date" date,
  "cover_image" jsonb,
  "description" text,
  "ai_summary" text,
  "body" text
);

create index if not exists preview_hot_issue_week_slug_idx on "preview_hot_issue" (week_slug);

create table if not exists "weekly_asset_performance" (
  id bigserial primary key,
  path text,
  hs_name text,
  "week_slug" text,
  "main_title" text,
  "page_subtitle" text,
  "page_date" date,
  "week_start_date" date,
  "week_end_date" date,
  "cover_image" jsonb,
  "description" text,
  "ai_summary" text,
  "body" text
);

create index if not exists weekly_asset_performance_week_slug_idx on "weekly_asset_performance" (week_slug);

create table if not exists "weekly_buy_list" (
  id bigserial primary key,
  path text,
  hs_name text,
  "week_slug" text,
  "week_start_date" date,
  "week_end_date" date,
  "model" text,
  "main_title" text,
  "page_subtitle" text,
  "page_date" date,
  "cover_image" jsonb,
  "description" text,
  "is_published" boolean,
  "cio_content" text,
  "core_pct" numeric,
  "satellite_pct" numeric,
  "gfi_weight" numeric,
  "gfi_lt_return" text,
  "gfi_target_12m" text,
  "gfi_eps_12m" text,
  "gfi_funds" text,
  "geq_weight" numeric,
  "geq_lt_return" text,
  "geq_target_12m" text,
  "geq_eps_12m" text,
  "geq_funds" text,
  "sat_1_name" text,
  "sat_1_sub" text,
  "sat_1_weight" numeric,
  "sat_1_lt_return" text,
  "sat_1_target_12m" text,
  "sat_1_eps_12m" text,
  "sat_1_funds" text,
  "sat_2_name" text,
  "sat_2_sub" text,
  "sat_2_weight" numeric,
  "sat_2_lt_return" text,
  "sat_2_target_12m" text,
  "sat_2_eps_12m" text,
  "sat_2_funds" text,
  "sat_3_name" text,
  "sat_3_sub" text,
  "sat_3_weight" numeric,
  "sat_3_lt_return" text,
  "sat_3_target_12m" text,
  "sat_3_eps_12m" text,
  "sat_3_funds" text,
  "sat_4_name" text,
  "sat_4_sub" text,
  "sat_4_weight" numeric,
  "sat_4_lt_return" text,
  "sat_4_target_12m" text,
  "sat_4_eps_12m" text,
  "sat_4_funds" text,
  "sat_5_name" text,
  "sat_5_sub" text,
  "sat_5_weight" numeric,
  "sat_5_lt_return" text,
  "sat_5_target_12m" text,
  "sat_5_eps_12m" text,
  "sat_5_funds" text,
  "sat_6_name" text,
  "sat_6_sub" text,
  "sat_6_weight" numeric,
  "sat_6_lt_return" text,
  "sat_6_target_12m" text,
  "sat_6_eps_12m" text,
  "sat_6_funds" text,
  "sat_7_name" text,
  "sat_7_sub" text,
  "sat_7_weight" numeric,
  "sat_7_lt_return" text,
  "sat_7_target_12m" text,
  "sat_7_eps_12m" text,
  "sat_7_funds" text,
  "sat_8_name" text,
  "sat_8_sub" text,
  "sat_8_weight" numeric,
  "sat_8_lt_return" text,
  "sat_8_target_12m" text,
  "sat_8_eps_12m" text,
  "sat_8_funds" text,
  "perf_lt_return" text,
  "perf_core_return" text,
  "perf_sat_return" text,
  "perf_risk_sd" text,
  "perf_var_95" text,
  "source_text" text
);

create index if not exists weekly_buy_list_week_slug_idx on "weekly_buy_list" (week_slug);

create table if not exists "weekly_hot_issue" (
  id bigserial primary key,
  path text,
  hs_name text,
  "week_slug" text,
  "main_title" text,
  "page_subtitle" text,
  "sub_title" text,
  "page_date" date,
  "week_start_date" date,
  "week_end_date" date,
  "cover_image" jsonb,
  "description" text,
  "ai_summary" text,
  "body" text,
  "is_published" boolean
);

create index if not exists weekly_hot_issue_week_slug_idx on "weekly_hot_issue" (week_slug);

create table if not exists "weekly_pdf" (
  id bigserial primary key,
  path text,
  hs_name text,
  "week_slug" text,
  "pdf_url" jsonb
);

create index if not exists weekly_pdf_week_slug_idx on "weekly_pdf" (week_slug);