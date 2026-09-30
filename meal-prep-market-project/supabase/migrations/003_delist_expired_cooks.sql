-- supabase/migrations/xxxxxxxx_delist_expired_cooks.sql
--
-- Sweeps cm_subscriptions for rows stuck in 'grace_period' past their
-- grace_period_ends_at, flips them to 'delisted', and sets the
-- corresponding cm_cooks.is_active = false. Runs on a schedule via
-- pg_cron — no Edge Function needed since this is a pure DB operation.

-- 1. Required extensions (enable once per project; safe to re-run).
create extension if not exists pg_cron with schema extensions;

-- 2. The sweep function itself.
create or replace function cm_delist_expired_cooks()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with expired as (
    update cm_subscriptions
    set status = 'delisted',
        updated_at = now()
    where status = 'grace_period'
      and grace_period_ends_at is not null
      and grace_period_ends_at < now()
    returning cook_id
  )
  update cm_cooks
  set is_active = false,
      updated_at = now()
  where id in (select cook_id from expired);
end;
$$;

-- Lock down execution — only the postgres/service role should ever
-- call this directly; it's driven by the cron schedule below, not by
-- application code or client requests.
revoke all on function cm_delist_expired_cooks() from public, anon, authenticated;

-- 3. Schedule the sweep to run hourly, on the hour.
--    Adjust the cron expression if you want tighter/looser timing —
--    hourly means a cook is delisted at most ~1 hour after their
--    7-day grace period technically expires, which is more than
--    tight enough for this use case.
select cron.schedule(
  'delist-expired-cooks',   -- job name (unique; re-running this migration is idempotent via unschedule below)
  '0 * * * *',              -- every hour, on the hour
  $$select cm_delist_expired_cooks();$$
);

-- =====================================================================
-- OPERATIONAL NOTES
-- =====================================================================
-- - pg_cron jobs run as the role that scheduled them (typically
--   `postgres` via the Supabase dashboard/SQL editor), which bypasses
--   RLS by default — this is expected and fine here since the function
--   itself is SECURITY DEFINER and tightly scoped to one operation.
--
-- - To inspect job run history:
--     select * from cron.job_run_details
--     where jobname = 'delist-expired-cooks'
--     order by start_time desc limit 20;
--
-- - To change the schedule later, unschedule and re-schedule:
--     select cron.unschedule('delist-expired-cooks');
--     select cron.schedule('delist-expired-cooks', '*/15 * * * *', $$select cm_delist_expired_cooks();$$);
--
-- - This job intentionally does NOT touch subscriptions with status
--   'past_due', 'trialing', 'active', or 'canceled' — only ones that
--   actually entered 'grace_period' via the invoice.payment_failed
--   webhook handler and have since passed their deadline.
--
-- - A cook who pays successfully mid-grace-period is moved back to
--   'active' by the invoice.payment_succeeded handler in the Stripe
--   webhook — so by the time this sweep runs, only genuinely lapsed
--   cooks remain in 'grace_period' with an expired timestamp.
