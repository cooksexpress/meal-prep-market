-- supabase/migrations/008_pause_orders_opening_hours.sql
--
-- 1. "Pause orders": a cook can stop taking orders and messages for a
--    while, optionally until a date. On that date (Gold Coast time) the
--    listing reopens by itself. The listing stays visible meanwhile.
-- 2. Opening days and hours, shown on the listing (information only).
--    Stored as JSON, e.g. {"mon": {"open": "08:00", "close": "16:00"}};
--    a day that's missing means closed.

alter table cm_cooks add column if not exists orders_paused boolean not null default false;
alter table cm_cooks add column if not exists paused_until date;
alter table cm_cooks add column if not exists opening_hours jsonb;

-- True while a cook's orders are paused (respects the "back on" date).
create or replace function cm_cook_is_paused(p_cook_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select c.orders_paused
            and (c.paused_until is null
                 or c.paused_until > (now() at time zone 'Australia/Brisbane')::date)
       from cm_cooks c
      where c.id = p_cook_id),
    false
  );
$$;

grant execute on function cm_cook_is_paused(uuid) to anon, authenticated;

-- No new messages while paused, whichever way they're sent.
create or replace function cm_block_inquiry_when_paused()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if cm_cook_is_paused(new.cook_id) then
    raise exception 'This cook isn''t taking orders right now.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists cm_block_inquiry_when_paused on cm_inquiries;
create trigger cm_block_inquiry_when_paused
  before insert on cm_inquiries
  for each row execute function cm_block_inquiry_when_paused();

-- No new orders while paused either.
drop trigger if exists cm_block_order_when_paused on cm_orders;
create trigger cm_block_order_when_paused
  before insert on cm_orders
  for each row execute function cm_block_inquiry_when_paused();

-- 3. Delivery / pickup details and order cut-off, shown on the listing.
--    delivery_method: 'delivery', 'pickup' or 'both'.
--    delivery_areas: suburbs they deliver to (or travel to, for in-home cooks).
--    delivery_days: day keys, e.g. {sun,wed}.
--    delivery_fee: null = not set, 0 = free.
--    pickup_area: suburb only (never a full address on a public page).
--    order_cutoff_day / order_cutoff_time: e.g. 'thu' / '18:00'.
alter table cm_cooks add column if not exists delivery_method text;
alter table cm_cooks add column if not exists delivery_areas text;
alter table cm_cooks add column if not exists delivery_days text[] not null default '{}';
alter table cm_cooks add column if not exists delivery_fee numeric(8,2);
alter table cm_cooks add column if not exists pickup_area text;
alter table cm_cooks add column if not exists order_cutoff_day text;
alter table cm_cooks add column if not exists order_cutoff_time text;

alter table cm_cooks drop constraint if exists cm_cooks_delivery_method_check;
alter table cm_cooks add constraint cm_cooks_delivery_method_check
  check (delivery_method is null or delivery_method in ('delivery', 'pickup', 'both'));

alter table cm_cooks drop constraint if exists cm_cooks_delivery_fee_check;
alter table cm_cooks add constraint cm_cooks_delivery_fee_check
  check (delivery_fee is null or (delivery_fee >= 0 and delivery_fee <= 500));

alter table cm_cooks drop constraint if exists cm_cooks_order_cutoff_day_check;
alter table cm_cooks add constraint cm_cooks_order_cutoff_day_check
  check (order_cutoff_day is null or order_cutoff_day in ('mon','tue','wed','thu','fri','sat','sun'));

-- Orders remember whether it was delivery or pickup, and any fee.
alter table cm_orders add column if not exists fulfilment text;
alter table cm_orders add column if not exists delivery_fee_amount numeric(10,2) not null default 0;

-- 4. "From $X a meal": the price range is now worked out from the menu
--    (cheapest and dearest price per meal of items that are available),
--    instead of being typed in by the cook. A pack's price per meal is
--    its price divided by its number of meals.
create or replace function cm_refresh_cook_price_range(p_cook_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update cm_cooks c
     set price_range_min = s.lowest,
         price_range_max = s.highest
    from (
      select min(per_meal) as lowest, max(per_meal) as highest
        from (
          select case
                   when p.item_type = 'pack' and coalesce(p.meal_count, 0) > 0
                     then round(p.indicative_price / p.meal_count, 2)
                   else p.indicative_price
                 end as per_meal
            from cm_packages p
           where p.cook_id = p_cook_id
             and p.is_available
             and p.indicative_price > 0
        ) items
    ) s
   where c.id = p_cook_id;
$$;

create or replace function cm_packages_refresh_price_range()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform cm_refresh_cook_price_range(old.cook_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.cook_id is distinct from old.cook_id) then
    perform cm_refresh_cook_price_range(new.cook_id);
  end if;
  return null;
end;
$$;

drop trigger if exists cm_packages_refresh_price_range on cm_packages;
create trigger cm_packages_refresh_price_range
  after insert or update or delete on cm_packages
  for each row execute function cm_packages_refresh_price_range();

-- Work out the price for every existing cook now.
select cm_refresh_cook_price_range(id) from cm_cooks;
