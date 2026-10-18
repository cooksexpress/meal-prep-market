-- supabase/migrations/009_inquiry_no_signin_email.sql
--
-- Customers no longer get a sign-in email when they message a cook or
-- order. We still keep a quiet customer record behind the scenes. If
-- the customer's email already has an account (for example a cook
-- messaging another cook), the server looks it up with this function.
-- Only the server (service role) may call it.

create or replace function cm_auth_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id from auth.users u where lower(u.email) = lower(p_email) limit 1;
$$;

revoke all on function cm_auth_user_id_by_email(text) from public;
revoke all on function cm_auth_user_id_by_email(text) from anon, authenticated;
grant execute on function cm_auth_user_id_by_email(text) to service_role;
