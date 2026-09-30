# Cook's Marketplace — Backend End-to-End Test Checklist

Covers the full chain: guest inquiry → client auto-creation → magic link →
cook notification → subscription lifecycle → grace period → delisting.

Run this **before** starting frontend work, against a Supabase project with
`supabase functions serve` running locally (or deployed to a staging
project) and Stripe in **test mode**.

---

## 0. Setup

```bash
# Link and start local dev environment
supabase start
supabase functions serve --env-file ./supabase/.env.local

# In a second terminal — forward Stripe webhook events to your local function
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

Note the webhook signing secret `stripe listen` prints out
(`whsec_...`) — set it as `STRIPE_WEBHOOK_SECRET` in `.env.local` and
restart `functions serve`.

Confirm required env vars are set for each function:
- `submit-inquiry`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`
- `notify-cook`: above + `RESEND_API_KEY`, `NOTIFICATIONS_FROM_EMAIL`
- `stripe-webhook`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

---

## 1. Guest Inquiry → Client Auto-Creation

**Seed a test cook first** (if you don't have one):

```sql
insert into cm_cooks (id, business_name, tier, is_active, declaration_accepted, declaration_accepted_at)
values (
  '11111111-1111-1111-1111-111111111111',  -- must be a real auth.users id in practice; for local testing insert into auth.users first
  'Test Kitchen Co',
  'tier_2_off_site',
  true,
  true,
  now()
);
```

**Submit a guest inquiry:**

```bash
curl -i -X POST 'http://localhost:54321/functions/v1/submit-inquiry' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -d '{
    "cook_id": "11111111-1111-1111-1111-111111111111",
    "name": "Test Client",
    "email": "testclient@example.com",
    "phone": "0400000000",
    "message": "Hi, do you cater for nut allergies?"
  }'
```

**Expect:** `200 { "success": true, "inquiry_id": "..." }`

**Verify in SQL:**

```sql
-- Client row was created
select id, full_name, email, phone from cm_clients where email = 'testclient@example.com';

-- Inquiry row exists and is linked to that client
select id, cook_id, client_id, client_name, message, magic_link_sent_at, email_notification_sent_at
from cm_inquiries
where client_email = 'testclient@example.com'
order by created_at desc limit 1;

-- Confirm auth user was created
select id, email, email_confirmed_at from auth.users where email = 'testclient@example.com';
```

**Checks:**
- [ ] `cm_clients` row exists with correct email/phone
- [ ] `auth.users` row exists with matching `id`
- [ ] `cm_inquiries.client_id` matches `cm_clients.id`
- [ ] `magic_link_sent_at` is populated (not null)

---

## 2. Repeat Guest — Same Email Resolves to Same Account

**Submit a second inquiry with the same email**, to a different cook (or
the same one):

```bash
curl -i -X POST 'http://localhost:54321/functions/v1/submit-inquiry' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -d '{
    "cook_id": "11111111-1111-1111-1111-111111111111",
    "name": "Test Client",
    "email": "testclient@example.com",
    "phone": "0400000000",
    "message": "Following up on my earlier question."
  }'
```

**Verify no duplicate client was created:**

```sql
select count(*) from cm_clients where email = 'testclient@example.com';
-- expect exactly 1

select id, client_id, message from cm_inquiries
where client_email = 'testclient@example.com'
order by created_at;
-- expect 2 rows, both with the SAME client_id
```

**Checks:**
- [ ] `cm_clients` still has exactly one row for this email
- [ ] Both inquiries share the same `client_id`

---

## 3. Magic Link Actually Logs the Client In

- [ ] Check the inbox for `testclient@example.com` (or Supabase's local
      Inbucket UI at `http://localhost:54324` if running locally) — a
      magic link email should have arrived.
- [ ] Click the link, confirm it redirects to `SITE_URL/inbox` with an
      active session.
- [ ] In the browser/app, confirm `supabase.auth.getUser()` returns the
      same `id` as the `cm_clients.id` row from Section 1.

```sql
-- Cross-check: does auth.uid() (once logged in) match cm_clients.id?
select id from cm_clients where email = 'testclient@example.com';
-- compare against the id shown in your auth session / JWT
```

---

## 4. Cook Notification Email

- [ ] Check the cook's inbox (or Inbucket) for the "New inquiry from
      Test Client" email.
- [ ] Confirm the email body shows correct name, email, phone, and
      message.

```sql
select email_notification_sent_at from cm_inquiries
where client_email = 'testclient@example.com'
order by created_at desc limit 1;
```

**Checks:**
- [ ] `email_notification_sent_at` is populated
- [ ] Re-invoking `notify-cook` with the same `inquiry_id` does **not**
      send a second email (idempotency guard):

```bash
curl -i -X POST 'http://localhost:54321/functions/v1/notify-cook' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -d '{"inquiry_id": "<the inquiry id from step 1>"}'
```
Expect: `200 { "success": true, "skipped": "already_sent" }`

---

## 5. Review Eligibility (RLS Enforcement)

**As the logged-in test client**, attempt to review a cook they've
messaged — should succeed:

```sql
-- Run as the authenticated client (via Supabase client SDK, not service role)
insert into cm_reviews (cook_id, client_id, inquiry_id, rating, review_text)
values (
  '11111111-1111-1111-1111-111111111111',
  '<client_id from cm_clients>',
  '<inquiry_id from step 1>',
  5,
  'Great communication and allergy-friendly options.'
);
```
**Checks:**
- [ ] Insert succeeds

**Attempt to review a cook they never messaged** — should fail via RLS:

```sql
insert into cm_reviews (cook_id, client_id, rating, review_text)
values (
  '<a DIFFERENT cook_id never contacted>',
  '<same client_id>',
  5,
  'Should not be allowed.'
);
```
**Checks:**
- [ ] Insert is rejected by RLS policy `cm_reviews_insert`

---

## 6. Stripe Subscription Created (trial start)

**Create a test customer + subscription with `cook_id` in metadata:**

```bash
stripe customers create \
  --email="cook-test@example.com" \
  --name="Test Kitchen Co"

# Note the returned customer id (cus_...), then:

stripe subscriptions create \
  --customer=cus_XXXXXXXXXXXX \
  --items[0][price]=price_XXXXXXXXXXXX \
  --trial-period-days=90 \
  --metadata[cook_id]=11111111-1111-1111-1111-111111111111
```

This fires `customer.subscription.created`, which `stripe listen`
forwards to your local webhook.

**Verify:**

```sql
select cook_id, status, stripe_subscription_id, trial_end_at, current_period_end
from cm_subscriptions
where cook_id = '11111111-1111-1111-1111-111111111111';

select is_active from cm_cooks where id = '11111111-1111-1111-1111-111111111111';
```

**Checks:**
- [ ] `cm_subscriptions.status = 'trialing'`
- [ ] `stripe_subscription_id` populated
- [ ] `cm_cooks.is_active = true`

---

## 7. Payment Failure → Grace Period

**Trigger a failed invoice payment event directly:**

```bash
stripe trigger invoice.payment_failed
```

> Note: `stripe trigger` generates its own test objects, so for a
> realistic test you may instead want to use a subscription with a
> card that's guaranteed to fail
> (`4000000000000341` in test mode) and let a real billing cycle
> attempt payment — or manually construct the event via the Stripe
> Dashboard's webhook test-send feature against your real subscription
> id so `metadata.cook_id` resolves correctly.

**Verify:**

```sql
select status, grace_period_ends_at from cm_subscriptions
where cook_id = '11111111-1111-1111-1111-111111111111';

select is_active from cm_cooks where id = '11111111-1111-1111-1111-111111111111';
```

**Checks:**
- [ ] `status = 'grace_period'`
- [ ] `grace_period_ends_at` ≈ 7 days from now
- [ ] `cm_cooks.is_active` is still `true` (grace period ≠ delisted)

---

## 8. Payment Success Clears Grace Period

```bash
stripe trigger invoice.payment_succeeded
```

(Same caveat as above re: using a real subscription id with correct
metadata for a fully realistic test.)

**Verify:**

```sql
select status, grace_period_ends_at from cm_subscriptions
where cook_id = '11111111-1111-1111-1111-111111111111';
```

**Checks:**
- [ ] `status = 'active'`
- [ ] `grace_period_ends_at` is `null`

---

## 9. Grace Period Expiry → Delisting (Cron Sweep)

**Manually backdate a grace period to simulate expiry** (fastest way to
test without waiting 7 real days):

```sql
update cm_subscriptions
set status = 'grace_period',
    grace_period_ends_at = now() - interval '1 hour'
where cook_id = '11111111-1111-1111-1111-111111111111';
```

**Manually invoke the sweep function** (don't wait for the hourly cron):

```sql
select cm_delist_expired_cooks();
```

**Verify:**

```sql
select status from cm_subscriptions where cook_id = '11111111-1111-1111-1111-111111111111';
select is_active from cm_cooks where id = '11111111-1111-1111-1111-111111111111';
```

**Checks:**
- [ ] `status = 'delisted'`
- [ ] `cm_cooks.is_active = false`

**Verify a cook still inside their grace period is untouched:**

```sql
-- Seed a second cook in grace_period with a future deadline, then re-run
-- the sweep and confirm it's NOT delisted.
select cm_delist_expired_cooks();
select status from cm_subscriptions where cook_id = '<second test cook id>';
-- expect: still 'grace_period', unchanged
```

**Verify the cron schedule itself is registered:**

```sql
select jobid, jobname, schedule, active from cron.job where jobname = 'delist-expired-cooks';

-- After waiting for a real run (or forcing one), check execution history:
select status, start_time, end_time, return_message
from cron.job_run_details
where jobname = 'delist-expired-cooks'
order by start_time desc limit 5;
```

---

## 10. Subscription Cancellation

```bash
stripe subscriptions cancel sub_XXXXXXXXXXXX
```

**Verify:**

```sql
select status from cm_subscriptions where stripe_subscription_id = 'sub_XXXXXXXXXXXX';
select is_active from cm_cooks where id = '11111111-1111-1111-1111-111111111111';
```

**Checks:**
- [ ] `status = 'canceled'`
- [ ] `cm_cooks.is_active = false`

---

## 11. Cross-Entity Isolation Sanity Check

Confirm the shared Supabase project isn't leaking data between Cook's
Marketplace and Cooks Express:

```sql
-- Should return 0 rows — cm_ tables should have no foreign keys or
-- references into any ce_-prefixed (Cooks Express) tables.
select conname, conrelid::regclass, confrelid::regclass
from pg_constraint
where conrelid::regclass::text like 'cm_%'
  and confrelid::regclass::text like 'ce_%';
```

**Checks:**
- [ ] Query returns 0 rows

---

## Sign-off

Once every checkbox above passes against a staging project (not just
local), the backend chain is ready to build the frontend against. Keep
the seeded test cook/client rows or clean them up — your call — but
document the cook_id/client_id used here if you plan to re-run this
checklist after future changes.
