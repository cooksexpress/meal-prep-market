-- supabase/migrations/006_free_trial_no_card.sql
--
-- Free trial without a card:
--   - Cooks start a 90-day free trial at the end of sign-up, no card.
--   - Their listing goes live straight away.
--   - Reminder emails go out 7 days and 1 day before the trial ends
--     (trial-reminders Edge Function; the *_sent_at columns stop repeats).
--   - If they haven't subscribed when the trial ends, the hourly sweep
--     hides the listing (status 'delisted'). Nothing is deleted, so
--     subscribing brings it straight back via the Stripe webhook.

-- 1. Track which reminder emails have been sent.
alter table cm_subscriptions add column if not exists trial_reminder_7d_sent_at timestamptz;
alter table cm_subscriptions add column if not exists trial_reminder_1d_sent_at timestamptz;

-- 2. Listing-visibility guard. Same rule as before (cooks can't switch
--    their own listing on), plus an explicit, transaction-local flag
--    that only our own trusted database functions set. Without it, the
--    scheduled sweep (no logged-in user) couldn't hide expired listings.
create or replace function cm_protect_is_active()
returns trigger
language plpgsql
security definer
as $$
declare
  trusted boolean :=
    auth.role() = 'service_role'
    or cm_is_admin()
    or coalesce(current_setting('cm.allow_activate', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    if not trusted then
      new.is_active := false;
    end if;
  elsif tg_op = 'UPDATE' then
    if not trusted then
      new.is_active := old.is_active;
    end if;
  end if;
  return new;
end;
$$;

-- 3. Start the free trial (called by the cook at the end of sign-up).
--    Safe to call twice: it never restarts or extends an existing trial,
--    and never relists someone whose trial already ran out.
create or replace function cm_start_free_trial()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ready boolean;
  existing_end timestamptz;
  new_end timestamptz;
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

  select trial_end_at into existing_end from cm_subscriptions where cook_id = uid;
  if found then
    return existing_end;
  end if;

  new_end := now() + interval '90 days';

  insert into cm_subscriptions (cook_id, status, trial_start_at, trial_end_at)
  values (uid, 'trialing', now(), new_end);

  perform set_config('cm.allow_activate', 'on', true);
  update cm_cooks set is_active = true, updated_at = now() where id = uid;

  return new_end;
end;
$$;

revoke all on function cm_start_free_trial() from public, anon;
grant execute on function cm_start_free_trial() to authenticated;

-- 4. Hourly sweep (already scheduled as 'delist-expired-cooks').
--    Now also hides listings whose free trial ended without a
--    subscription. Cooks who added a card are handled by Stripe instead.
create or replace function cm_delist_expired_cooks()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('cm.allow_activate', 'on', true);

  -- a) Payment failed and the 7-day grace period ran out.
  with expired as (
    update cm_subscriptions
    set status = 'delisted', updated_at = now()
    where status = 'grace_period'
      and grace_period_ends_at is not null
      and grace_period_ends_at < now()
    returning cook_id
  )
  update cm_cooks
  set is_active = false, updated_at = now()
  where id in (select cook_id from expired);

  -- b) Free trial ended and they never subscribed.
  with trial_over as (
    update cm_subscriptions
    set status = 'delisted', updated_at = now()
    where status = 'trialing'
      and stripe_subscription_id is null
      and trial_end_at < now()
    returning cook_id
  )
  update cm_cooks
  set is_active = false, updated_at = now()
  where id in (select cook_id from trial_over);
end;
$$;

revoke all on function cm_delist_expired_cooks() from public, anon, authenticated;
