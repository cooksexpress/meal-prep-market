-- supabase/migrations/014_search_cooks.sql
--
-- The homepage search box. Finds live cooks where every word typed
-- appears somewhere in their listing: business or first name, bio,
-- cuisine and dietary tags, delivery and pickup areas, region, or any
-- menu item's name, description or dietary tags. Not case-sensitive.
-- Returns cook ids; the website then loads those cooks as usual.
-- Runs with the visitor's own permissions (only live cooks and their
-- menus are visible to the public anyway).

create or replace function cm_search_cooks(p_q text)
returns setof uuid
language sql
stable
set search_path = public
as $$
  with words as (
    select replace(replace(replace(w, '\', '\\'), '%', '\%'), '_', '\_') as w
    from unnest(regexp_split_to_array(btrim(coalesce(p_q, '')), '\s+')) as w
    where w <> ''
    limit 8
  ),
  cooks as (
    select c.id,
      concat_ws(' ',
        c.business_name, c.first_name, c.bio, c.delivery_areas, c.pickup_area, c.region,
        array_to_string(c.cuisine_tags, ' '),
        array_to_string(c.dietary_specialty_tags, ' '),
        (select string_agg(concat_ws(' ', p.name, p.description, array_to_string(p.dietary_tags, ' ')), ' ')
           from cm_packages p where p.cook_id = c.id)
      ) as haystack
    from cm_cooks c
    where c.is_active
  )
  select k.id
  from cooks k
  where exists (select 1 from words)
    and not exists (
      select 1 from words
      where k.haystack not ilike '%' || words.w || '%'
    );
$$;

revoke all on function cm_search_cooks(text) from public;
grant execute on function cm_search_cooks(text) to anon, authenticated;
