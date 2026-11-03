-- supabase/migrations/013_cook_region.sql
--
-- Which area each cook is based in, so customers can later choose
-- Gold Coast or Brisbane. For now the site shows everyone in one list,
-- with the area shown on each cook's card. Existing cooks start as
-- Gold Coast (they can change it in their profile).

alter table cm_cooks add column if not exists region text;

alter table cm_cooks drop constraint if exists cm_cooks_region_check;
alter table cm_cooks add constraint cm_cooks_region_check
  check (region is null or region in ('Gold Coast', 'Brisbane', 'Other Queensland'));

update cm_cooks set region = 'Gold Coast' where region is null;
