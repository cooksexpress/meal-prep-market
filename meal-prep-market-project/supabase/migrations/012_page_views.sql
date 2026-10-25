-- supabase/migrations/012_page_views.sql
--
-- A simple, private visit counter (no cookies, no names, no IP addresses):
--   - cm_page_views: one row per page view. kind = 'home' (homepage) or
--     'cook' (a cook's listing, with cook_id).
--   - cm_record_view(): called by the website when a page opens. Anyone
--     can call it; it ignores cooks viewing their own page and admins.
--   - cm_my_view_stats(): a cook's own views and enquiries (dashboard).
--   - cm_admin_stats() / cm_admin_cook_stats(): totals for the admin page.
-- Nobody can read the raw table directly.

create table if not exists cm_page_views (
  id bigserial primary key,
  kind text not null check (kind in ('home', 'cook')),
  cook_id uuid references cm_cooks(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_cm_page_views_created on cm_page_views(created_at);
create index if not exists idx_cm_page_views_cook on cm_page_views(cook_id, created_at);

alter table cm_page_views enable row level security;
-- No policies: only the functions below (security definer) touch it.

create or replace function cm_record_view(p_kind text, p_cook_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('home', 'cook') then
    return;
  end if;
  if p_kind = 'cook' and (p_cook_id is null or not exists (select 1 from cm_cooks where id = p_cook_id)) then
    return;
  end if;
  -- Don't count cooks looking at their own page, or admins.
  if auth.uid() is not null and (auth.uid() = p_cook_id or cm_is_admin()) then
    return;
  end if;
  insert into cm_page_views (kind, cook_id)
  values (p_kind, case when p_kind = 'cook' then p_cook_id else null end);
end;
$$;

revoke all on function cm_record_view(text, uuid) from public;
grant execute on function cm_record_view(text, uuid) to anon, authenticated;

-- A cook's own numbers: page views and enquiries, last 30 days and all time.
create or replace function cm_my_view_stats()
returns table (views_30d bigint, views_total bigint, enquiries_30d bigint, enquiries_total bigint)
language sql
security definer
stable
set search_path = public
as $$
  select
    (select count(*) from cm_page_views where cook_id = auth.uid() and created_at > now() - interval '30 days'),
    (select count(*) from cm_page_views where cook_id = auth.uid()),
    (select count(*) from cm_inquiries where cook_id = auth.uid() and created_at > now() - interval '30 days'),
    (select count(*) from cm_inquiries where cook_id = auth.uid());
$$;

revoke all on function cm_my_view_stats() from public, anon;
grant execute on function cm_my_view_stats() to authenticated;

-- Admin: totals per day for the last N days (Gold Coast dates).
create or replace function cm_admin_stats(p_days int default 30)
returns table (day date, home_views bigint, cook_views bigint, enquiries bigint)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not cm_is_admin() then
    raise exception 'Admins only';
  end if;
  return query
  with days as (
    select generate_series(
      (now() at time zone 'Australia/Brisbane')::date - (least(greatest(p_days, 1), 365) - 1),
      (now() at time zone 'Australia/Brisbane')::date,
      interval '1 day'
    )::date as day
  )
  select
    d.day,
    (select count(*) from cm_page_views v where v.kind = 'home' and (v.created_at at time zone 'Australia/Brisbane')::date = d.day),
    (select count(*) from cm_page_views v where v.kind = 'cook' and (v.created_at at time zone 'Australia/Brisbane')::date = d.day),
    (select count(*) from cm_inquiries i where (i.created_at at time zone 'Australia/Brisbane')::date = d.day)
  from days d
  order by d.day desc;
end;
$$;

revoke all on function cm_admin_stats(int) from public, anon;
grant execute on function cm_admin_stats(int) to authenticated;

-- Admin: each cook's views and enquiries (last 30 days and all time).
create or replace function cm_admin_cook_stats()
returns table (cook_id uuid, business_name text, is_active boolean,
               views_30d bigint, views_total bigint, enquiries_30d bigint, enquiries_total bigint)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not cm_is_admin() then
    raise exception 'Admins only';
  end if;
  return query
  select c.id, c.business_name, c.is_active,
    (select count(*) from cm_page_views v where v.cook_id = c.id and v.created_at > now() - interval '30 days'),
    (select count(*) from cm_page_views v where v.cook_id = c.id),
    (select count(*) from cm_inquiries i where i.cook_id = c.id and i.created_at > now() - interval '30 days'),
    (select count(*) from cm_inquiries i where i.cook_id = c.id)
  from cm_cooks c
  order by 4 desc, c.business_name;
end;
$$;

revoke all on function cm_admin_cook_stats() from public, anon;
grant execute on function cm_admin_cook_stats() to authenticated;
