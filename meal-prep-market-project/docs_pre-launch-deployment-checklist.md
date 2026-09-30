# Cook's Marketplace — Pre-Launch Deployment Checklist

Run in this order. Each section assumes the previous one is complete.

---

## 0. Launch-Blocking Non-Technical Gates

Confirm both before proceeding past Section 4 (live Stripe keys) —
these were flagged as open items in the spec itself, not optional:

- [ ] ToS reviewed and finalized by an Australian marketplace/tech
      lawyer, including the review moderation/notice-and-takedown clause
- [ ] Final subscription price point decided (needed to create the
      live-mode Stripe Price in Section 4)

---

## 1. Supabase Production Project Setup

```bash
# Link the CLI to your production project (separate from local/staging)
supabase login
supabase link --project-ref <PRODUCTION_PROJECT_REF>
```

**Push schema migrations in order:**

```bash
# Confirm migration files are present and in the right order first
ls supabase/migrations/

supabase db push
```

This should apply, in sequence: the core `cm_` schema
(`cooks-marketplace-schema.sql`, including the `cm_protect_is_active`
trigger), `storage-buckets.sql`, and the `delist-expired-cooks.sql`
migration (pg_cron function + schedule).

**Verify after push:**

```sql
-- Confirm every cm_ table exists
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'cm_%';

-- Confirm RLS is enabled on all of them
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename like 'cm_%';
-- every row should show rowsecurity = true

-- Confirm the is_active protection trigger exists
select tgname from pg_trigger where tgname = 'trg_cm_cooks_protect_is_active';

-- Confirm the cron job is scheduled
select jobname, schedule, active from cron.job where jobname = 'delist-expired-cooks';

-- Confirm storage buckets exist
select id, public from storage.buckets where id in ('cook-profile-photos', 'cook-gallery');
```

- [ ] All `cm_` tables present
- [ ] RLS enabled on every `cm_` table
- [ ] `trg_cm_cooks_protect_is_active` trigger present
- [ ] `delist-expired-cooks` cron job present and `active = true`
- [ ] Both storage buckets present with `public = true`

---

## 2. Deploy Edge Functions

```bash
supabase functions deploy submit-inquiry
supabase functions deploy notify-cook
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
```

**Set secrets** (these are per-project, not per-function, in Supabase):

```bash
supabase secrets set \
  RESEND_API_KEY=<live_resend_key> \
  NOTIFICATIONS_FROM_EMAIL=notifications@cooksmarketplace.com.au \
  SITE_URL=https://cooksmarketplace.com.au \
  STRIPE_SECRET_KEY=<LIVE_MODE_secret_key> \
  STRIPE_WEBHOOK_SECRET=<set_after_Section_4_below> \
  STRIPE_PRICE_ID=<live_mode_price_id>
```

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already injected
> automatically into every Edge Function's environment by Supabase —
> don't set these manually.

**Verify deployment:**

```bash
supabase functions list
```

- [ ] All 5 functions show as deployed
- [ ] Secrets set (spot-check with `supabase secrets list` — values are
      redacted but names should all be present)

---

## 3. Domain & DNS

**Netlify (frontend):**

```bash
netlify sites:create --name cooks-marketplace
netlify domains:add cooksmarketplace.com.au
```

- [ ] Add the DNS records Netlify provides (typically an `A`/`ALIAS`
      record for the apex domain and a `CNAME` for `www`) at your
      domain registrar
- [ ] Confirm HTTPS certificate provisions automatically (Netlify does
      this via Let's Encrypt once DNS resolves — can take a few minutes
      to a few hours)
- [ ] Confirm `https://cooksmarketplace.com.au` loads the site, not a
      Netlify default page

**Supabase Auth redirect URLs** — the magic link won't work in
production until this is set:

```bash
# Via Dashboard: Authentication → URL Configuration
# Site URL: https://cooksmarketplace.com.au
# Redirect URLs (add both):
#   https://cooksmarketplace.com.au/auth/callback
#   https://cooksmarketplace.com.au/**
```

- [ ] Site URL set to production domain
- [ ] Redirect URLs include `/auth/callback`

---

## 4. Stripe Live Mode

**Switch the Stripe Dashboard to Live mode**, then:

1. **Create the live-mode Price** (matches the final price point from
   Section 0):
   ```bash
   stripe prices create \
     --unit-amount=<amount_in_cents> \
     --currency=aud \
     --recurring[interval]=month \
     --product-data[name]="Cook's Marketplace Listing"
   ```
   Note the returned `price_id` — this is your live `STRIPE_PRICE_ID`.

2. **Create the live webhook endpoint:**
   ```bash
   stripe webhook_endpoints create \
     --url=https://<PRODUCTION_PROJECT_REF>.supabase.co/functions/v1/stripe-webhook \
     --enabled-events=customer.subscription.created \
     --enabled-events=customer.subscription.updated \
     --enabled-events=customer.subscription.deleted \
     --enabled-events=invoice.payment_failed \
     --enabled-events=invoice.payment_succeeded
   ```
   Note the returned signing secret (`whsec_...`) — this is your live
   `STRIPE_WEBHOOK_SECRET`. Set it:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. **Re-deploy or restart functions** so the new secrets take effect:
   ```bash
   supabase functions deploy stripe-webhook
   ```

- [ ] Live-mode Price created, id captured
- [ ] Live webhook endpoint created pointing at production Edge Function URL
- [ ] `STRIPE_WEBHOOK_SECRET` set to the LIVE signing secret (not the
      `stripe listen` one from local testing)
- [ ] `STRIPE_PRICE_ID` secret matches the live Price id, not a test one

**Sanity check — confirm you're not accidentally live-testing with test
cards:** a `4242...` test card should now be REJECTED in live mode.

---

## 5. Frontend Production Environment Variables

Set in your hosting platform's environment variable settings (Netlify
dashboard → Site settings → Environment variables), not committed to
the repo:

```
NEXT_PUBLIC_SUPABASE_URL=https://<PRODUCTION_PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production_anon_key>
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://<PRODUCTION_PROJECT_REF>.supabase.co/functions/v1
```

- [ ] All three set
- [ ] Confirm no `SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY` is present
      anywhere in frontend env vars (these belong only in Supabase Edge
      Function secrets, never client-exposed)

**Trigger a production deploy and confirm the build succeeds:**

```bash
netlify deploy --prod
```

---

## 6. Seed the First Admin

There's no self-service admin signup — the first admin has to be
inserted manually:

```sql
-- Find the auth.users id of whoever should be the first admin
-- (they must sign in via magic link once first so the auth.users row exists)
select id, email from auth.users where email = 'you@cooksmarketplace.com.au';

insert into cm_admins (id) values ('<that_id>');
```

- [ ] First admin seeded and confirmed able to load `/admin`

---

## 7. Post-Deploy Smoke Test

Run the abbreviated version of the full E2E plan against production —
just the critical path, not every checkbox from the staging run:

- [ ] Submit a real guest inquiry on the live site → confirm magic link
      and cook notification emails actually arrive (real email, not
      Inbucket)
- [ ] Complete one real cook onboarding through Stripe Checkout in live
      mode with a real card, confirm the listing goes live after
      webhook processing, then immediately cancel that test
      subscription via the Stripe Dashboard to avoid an ongoing charge
- [ ] Confirm `/admin` and `/cook-dashboard` both load correctly on
      the production domain
- [ ] Confirm the cron job has a real run logged:
  ```sql
  select * from cron.job_run_details
  where jobname = 'delist-expired-cooks'
  order by start_time desc limit 1;
  ```

---

## 8. Rollback Plan

Know this before you need it, not after:

- [ ] Netlify: previous deploys are one click to roll back to
      (Site → Deploys → select previous → "Publish deploy")
- [ ] Supabase migrations: `supabase db push` is forward-only — have a
      down-migration or manual rollback SQL ready for the `cm_` schema
      if something goes wrong post-launch, since there's no automatic
      `db pull`-and-revert for a live database with real data in it
- [ ] Stripe webhook: can be disabled instantly from the Dashboard if
      it starts misbehaving, without affecting existing subscriptions

---

## Sign-off

Sections 1–7 are yours to execute once Section 0's two non-technical
gates are actually closed out — I can't confirm either of those for
you, since they're legal and business decisions outside what I can
verify from here.
