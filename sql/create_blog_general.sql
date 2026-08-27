create table if not exists "blog_general" (
  id bigserial primary key,
  path text,
  hs_name text,
  "slug" text,
  "main_campaign" text,
  "campaign_value" text,
  "title" text,
  "thumbnail" jsonb,
  "content" text,
  "conditions_title" text,
  "conditions" text,
  "conditions_title_1" text,
  "conditions_1" text,
  "conditions_title_2" text,
  "conditions_2" text,
  "cta_label" text,
  "cta_url" text,
  "show_inproject" jsonb
);

create index if not exists blog_general_slug_idx on "blog_general" (slug);
alter table "blog_general" enable row level security;
create policy "public read access" on "blog_general" for select to anon, authenticated using (true);
