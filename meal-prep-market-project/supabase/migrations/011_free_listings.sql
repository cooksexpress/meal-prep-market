-- supabase/migrations/011_free_listings.sql
--
-- Listing is now free, with no time limit (optional paid extras may come
-- later). Replaces the 90-day free trial:
--   - New status 'free': listed at no cost, no card, never auto-hidden.
--   - Everyone currently on a no-card trial moves to 'free'.
--   - cm_start_free_trial() (still called at the end of sign-up) now
--     puts new cooks on 'free' and lists them straight away.
--   - The daily trial-reminder emails are switched off.
-- The hourly sweep only hides 'trialing' (trial over) and 'grace_period'
-- (failed payment) rows, so 'free' listings are never hidden by it.

-- 1. Allow the new status.
alter table cm_subscriptions drop constraint if exists cm_subscriptions_status_check;
alter table cm_subscriptions add constraint cm_subscriptions_status_check check (
  status in ('free', 'trialing', 'active', 'past_due', 'grace_period', 'canceled', 'delisted')
);

-- 2. Move current no-card trials to free.
update cm_subscriptions
   set status = 'free', updated_at = now()
 where status = 'trialing'
   and stripe_subscription_id is null;

-- 3. Sign-up now starts a free listing (function name kept, the website
--    calls it). Safe to call twice; never relists a hidden listing.
create or replace function cm_start_free_trial()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ready boolean;
  existing_start timestamptz;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select declaration_accepted into ready from cm_cooks where id = uid;
  if ready is null then
    raise exception 'Please complete your profile first';
  end if;
  if not ready then
    raise exception 'Please accept the compliance declaration first';
  end if;

  select trial_start_at into existing_start from cm_subscriptions where cook_id = uid;
  if found then
    return existing_start;
  end if;

  -- trial_end_at is required by the table; for free listings it just
  -- records the start and is never used to hide anything.
  insert into cm_subscriptions (cook_id, status, trial_start_at, trial_end_at)
  values (uid, 'free', now(), now());

  perform set_config('cm.allow_activate', 'on', true);
  update cm_cooks set is_active = true, updated_at = now() where id = uid;

  return now();
end;
$$;

revoke all on function cm_start_free_trial() from public, anon;
grant execute on function cm_start_free_trial() to authenticated;

-- 4. Stop the daily trial-reminder emails.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'trial-reminders-daily') then
    perform cron.unschedule('trial-reminders-daily');
  end if;
end;
$$;
