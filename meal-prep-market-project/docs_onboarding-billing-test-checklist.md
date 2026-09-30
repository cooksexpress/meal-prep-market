# Cook's Marketplace — Onboarding & Billing Gate Test Checklist

Covers the chain: magic-link signup → tier/declaration/profile → Stripe
Checkout → webhook activation. The core thing under test is the billing
gate itself — that a cook genuinely cannot appear in search without a
valid trial/subscription, no matter what path they take through the UI
or API.

Run against a staging Supabase project + Stripe test mode.

---

## 1. Self-Activation Is Actually Blocked (the critical one)

This is the fix that matters most — verify it directly in SQL, not just
through the UI, since the UI simply never sends `is_active` at all.

**As an authenticated cook (using their own JWT, not service role),
attempt to force-activate directly:**

```sql
-- Run this AS the cook (e.g. via the Supabase client SDK with their
-- session, or `set role authenticated; set request.jwt.claims = ...`
-- in a SQL session that simulates their auth context)
update cm_cooks set is_active = true where id = '<cook_id>';

select is_active from cm_cooks where id = '<cook_id>';
```

**Checks:**
- [ ] The `UPDATE` does not error (RLS allows the update to proceed —
      that's expected, since cooks can edit their own row)
- [ ] `is_active` is still `false` afterward — the trigger silently
      overwrote the attempted value back to the prior state

**Also test at insert time**, simulating a brand-new signup trying to
sneak `is_active: true` into the initial insert:

```sql
insert into cm_cooks (id, business_name, tier, is_active)
values ('<new test cook auth.users id>', 'Sneaky Kitchen', 'tier_1_in_home', true);

select is_active from cm_cooks where id = '<new test cook auth.users id>';
```

**Checks:**
- [ ] `is_active` is `false` regardless of the `true` sent in the insert

**Confirm the trigger doesn't block the SERVICE ROLE or an admin:**

```sql
-- As service_role (e.g. via supabaseAdmin client, same as the
-- stripe-webhook function uses)
update cm_cooks set is_active = true where id = '<cook_id>';
select is_active from cm_cooks where id = '<cook_id>';
```

**Checks:**
- [ ] Service role update succeeds — `is_active` is now `true`
- [ ] Repeat as an authenticated admin (a user with a `cm_admins` row)
      — should also succeed

---

## 2. Storage RLS — Uploads Are Path-Restricted

**As Cook A, attempt to upload into Cook B's folder:**

```js
// Using Cook A's authenticated Supabase client
const { error } = await supabase.storage
  .from("cook-gallery")
  .upload(`<COOK_B_ID>/sneaky.jpg`, someFile);
```

**Checks:**
- [ ] Upload is rejected (RLS policy `cm_storage_gallery_owner_insert`
      requires the first path segment to equal `auth.uid()`)

**As Cook A, upload into their own folder — should succeed:**

```js
const { error } = await supabase.storage
  .from("cook-gallery")
  .upload(`<COOK_A_ID>/${crypto.randomUUID()}.jpg`, someFile);
```

**Checks:**
- [ ] Upload succeeds
- [ ] Public URL is retrievable and loads without auth
      (`getPublicUrl` + fetch in an incognito/unauthenticated context)

**Repeat both cases for the `cook-profile-photos` bucket.**

**As Cook A, attempt to delete a file from Cook B's folder:**

```js
const { error } = await supabase.storage
  .from("cook-gallery")
  .remove([`<COOK_B_ID>/some-existing-file.jpg`]);
```

**Checks:**
- [ ] Delete is rejected

---

## 3. Onboarding Happy Path (UI or direct calls)

Walk through as a fresh test cook:

1. `/onboarding` — submit email, confirm magic link email arrives
2. Click link → lands on `/onboarding/tier` with an active session
3. Submit business name + tier
   ```sql
   select business_name, tier, is_active, declaration_accepted
   from cm_cooks where id = '<cook_id>';
   -- expect: values set, is_active = false, declaration_accepted = false
   ```
4. `/onboarding/declaration` — check the box, submit
   ```sql
   select declaration_accepted, declaration_accepted_at
   from cm_cooks where id = '<cook_id>';
   -- expect: true, timestamp populated
   ```
5. `/onboarding/profile` — add a gallery photo, add one package, fill
   bio/tags/price/contact fields, submit
   ```sql
   select bio, cuisine_tags, dietary_specialty_tags, price_range_min,
          price_range_max, public_contact_email, public_contact_phone
   from cm_cooks where id = '<cook_id>';

   select count(*) from cm_cook_media where cook_id = '<cook_id>';
   select count(*) from cm_packages where cook_id = '<cook_id>';
   ```
6. `/onboarding/billing` — click "Start free trial"

**Checks:**
- [ ] Redirected to Stripe Checkout (real Stripe-hosted page in test mode)
- [ ] Checkout page shows the correct price and a 90-day trial notice

---

## 4. Checkout Session Auth — Can't Checkout as Someone Else

**Attempt to call `create-checkout-session` with a valid session but
before completing declaration/profile:**

```bash
curl -i -X POST 'http://localhost:54321/functions/v1/create-checkout-session' \
  -H "Authorization: Bearer <access_token of a cook who hasn't accepted the declaration>"
```

**Checks:**
- [ ] `400` with an error message telling them to complete their
      profile/declaration first

**Attempt to call it with no Authorization header:**

```bash
curl -i -X POST 'http://localhost:54321/functions/v1/create-checkout-session'
```

**Checks:**
- [ ] `401 Missing Authorization header`

**Attempt to call it with a garbage/expired token:**

```bash
curl -i -X POST 'http://localhost:54321/functions/v1/create-checkout-session' \
  -H "Authorization: Bearer garbage_token_value"
```

**Checks:**
- [ ] `401 Invalid or expired session`

---

## 5. Metadata Propagation — Session → Subscription

This is the detail most likely to silently break the whole billing
gate, so verify it directly against Stripe rather than just trusting
the code.

**After completing a real test checkout (Section 3), inspect the
resulting objects in the Stripe Dashboard (test mode) or via CLI:**

```bash
stripe subscriptions retrieve sub_XXXXXXXXXXXX
```

**Checks:**
- [ ] The subscription's `metadata.cook_id` matches the cook's actual
      `auth.users.id` / `cm_cooks.id`
- [ ] `trial_end` is ~90 days out
- [ ] (Sanity check only — session metadata is NOT what the webhook
      reads) `stripe checkout sessions retrieve cs_test_...` also shows
      `metadata.cook_id`, confirming both were set correctly

---

## 6. Webhook Activation — The Gate Actually Opens

**Confirm `stripe listen` forwarded `customer.subscription.created` and
check the result:**

```sql
select status, stripe_subscription_id, trial_end_at
from cm_subscriptions where cook_id = '<cook_id>';

select is_active from cm_cooks where id = '<cook_id>';
```

**Checks:**
- [ ] `cm_subscriptions.status = 'trialing'`
- [ ] `cm_cooks.is_active = true` — this is the moment the cook
      actually becomes visible in search

**Confirm the cook now appears in a real search query:**

```sql
select id, business_name from cm_cooks
where is_active = true and tier = '<their tier>';
```

**Checks:**
- [ ] Cook's row is present

**Visit `/cooks` in the browser and confirm the card renders.**

---

## 7. Negative Case — Webhook Never Fires

Simulate a checkout that completes on Stripe's side but where the
webhook delivery fails or is delayed (e.g. stop `stripe listen`
briefly, or use the Stripe Dashboard to resend a failed event later).

**Checks:**
- [ ] `cm_cooks.is_active` remains `false` until the webhook actually
      processes — confirming there's no other path (e.g. the
      `/onboarding/complete` page itself) that flips activation
- [ ] Once the webhook is redelivered (Stripe Dashboard → Webhooks →
      resend), `is_active` flips to `true` retroactively without any
      further user action

---

## 8. Full Negative Path — Trial Cancelled Before It Starts

**Cancel the subscription immediately after creating it:**

```bash
stripe subscriptions cancel sub_XXXXXXXXXXXX
```

**Checks:**
- [ ] `cm_subscriptions.status = 'canceled'`
- [ ] `cm_cooks.is_active = false`
- [ ] Cook no longer appears in `/cooks` search results

---

## Sign-off

All checks above should pass on staging before building `/cook-dashboard/*`
and `/admin/*` — both of those surfaces assume `is_active` is a trustworthy
signal of "this cook has a valid trial or subscription," and this checklist
is what actually proves that assumption holds.
