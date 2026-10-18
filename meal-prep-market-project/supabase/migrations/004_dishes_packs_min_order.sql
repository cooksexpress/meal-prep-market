-- supabase/migrations/004_dishes_packs_min_order.sql
--
-- Menu items are now either a single dish (one meal, clients choose
-- how many) or a pack (a bundle of meals at a set price). Cooks can
-- also set a minimum number of meals per order.

alter table cm_packages
  add column if not exists item_type text not null default 'dish';

alter table cm_packages drop constraint if exists cm_packages_item_type_check;
alter table cm_packages
  add constraint cm_packages_item_type_check check (item_type in ('dish', 'pack'));

-- Anything already saved with more than one meal is treated as a pack.
update cm_packages set item_type = 'pack' where meal_count is not null and meal_count > 1;

alter table cm_cooks
  add column if not exists min_order_meals int;

alter table cm_cooks drop constraint if exists cm_cooks_min_order_meals_check;
alter table cm_cooks
  add constraint cm_cooks_min_order_meals_check
  check (min_order_meals is null or (min_order_meals >= 1 and min_order_meals <= 100));
