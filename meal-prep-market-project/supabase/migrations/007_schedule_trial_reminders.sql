-- supabase/migrations/007_schedule_trial_reminders.sql
--
-- RUN THIS LATER, after the trial-reminders Edge Function is deployed.
-- Calls it once a day at 9am Brisbane time (23:00 UTC).
--
-- Before running, store the service role key in Supabase Vault:
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
-- (Supabase > Project Settings > API Keys > service_role. Never put it
-- in website code or share it.)

create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'trial-reminders-daily',
  '0 23 * * *',
  $$
  select net.http_post(
    url := 'https://ttkeelkivaeczdjozawq.supabase.co/functions/v1/trial-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
