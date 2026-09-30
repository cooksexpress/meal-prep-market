-- =====================================================================
-- COOK'S MARKETPLACE — DATABASE SCHEMA (Supabase / Postgres)
-- Shared Supabase project with Cooks Express.
-- All tables below are prefixed `cm_` and isolated via RLS so that
-- Cooks Express tables/data are never exposed through this schema
-- and vice versa (separate legal entities).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. COOKS
-- One row per cook account. Auth handled via Supabase Auth (auth.users).
-- ---------------------------------------------------------------------
create table cm_cooks (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  business_name text not null,
  bio text,
  abn text,                              -- self-reported, not verified against ABN Lookup API (MVP)
  tier text not null check (tier in ('tier_1_in_home', 'tier_2_off_site')),
  cuisine_tags text[] default '{}',
  dietary_specialty_tags text[] default '{}',
  price_range_min numeric(10,2),
  price_range_max numeric(10,2),
  profile_photo_url text,
  public_contact_email text,             -- shown to clients for off-platform follow-up; deliberately separate from the cook's private auth/login email
  public_contact_phone text,
  declaration_accepted boolean not null default false,
  declaration_accepted_at timestamptz,
  is_active boolean not null default true,   -- toggled false on delist (abuse removal or lapsed sub)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cm_cooks_tier on cm_cooks(tier);
create index idx_cm_cooks_cuisine on cm_cooks using gin(cuisine_tags);
create index idx_cm_cooks_dietary on cm_cooks using gin(dietary_specialty_tags);
create index idx_cm_cooks_active on cm_cooks(is_active);

-- ---------------------------------------------------------------------
-- 2. COOK MEDIA (photo gallery of past meals)
-- ---------------------------------------------------------------------
create table cm_cook_media (
  id uuid primary key default gen_random_uuid(),
  cook_id uuid not null references cm_cooks(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

create index idx_cm_cook_media_cook_id on cm_cook_media(cook_id);

-- ---------------------------------------------------------------------
-- 3. PACKAGES (sample menu/package examples on a cook's profile)
-- ---------------------------------------------------------------------
create table cm_packages (
  id uuid primary key default gen_random_uuid(),
  cook_id uuid not null references cm_cooks(id) on delete cascade,
  name text not null,               -- e.g. "Standard Prep — 10 Meals"
  description text,
  meal_count int,
  indicative_price numeric(10,2),
  sort_order int default 0,
  created_at timestamptz not null default now()
);

create index idx_cm_packages_cook_id on cm_packages(cook_id);

-- ---------------------------------------------------------------------
-- 4. CLIENTS
-- Minimal — just enough identity to submit an inquiry and leave a review.
-- Can be anonymous/guest (no auth.users row) or authenticated; MVP assumes
-- lightweight auth via Supabase Auth (email/magic link) for review integrity.
-- ---------------------------------------------------------------------
create table cm_clients (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null unique,        -- unique so repeat guest inquiries resolve to the same account
  phone text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. INQUIRIES (client -> cook contact form submissions)
-- Triggers an email notification to the cook; no in-app chat/threading.
-- ---------------------------------------------------------------------
create table cm_inquiries (
  id uuid primary key default gen_random_uuid(),
  cook_id uuid not null references cm_cooks(id) on delete cascade,
  client_id uuid not null references cm_clients(id) on delete cascade,  -- always set: guest inquiries auto-create the client row before this insert
  client_name text not null,          -- snapshot at time of inquiry, kept even if client later edits their profile
  client_email text not null,
  client_phone text,
  message text not null,
  magic_link_sent_at timestamptz,     -- when the login link was emailed for this inquiry
  email_notification_sent_at timestamptz,  -- when the cook was notified
  created_at timestamptz not null default now()
);

create index idx_cm_inquiries_cook_id on cm_inquiries(cook_id);
create index idx_cm_inquiries_client_id on cm_inquiries(client_id);

-- ---------------------------------------------------------------------
-- 6. REVIEWS
-- Only a client who has submitted a genuine inquiry to a cook may review
-- them (enforced by policy below referencing cm_inquiries).
-- ---------------------------------------------------------------------
create table cm_reviews (
  id uuid primary key default gen_random_uuid(),
  cook_id uuid not null references cm_cooks(id) on delete cascade,
  client_id uuid not null references cm_clients(id) on delete cascade,
  inquiry_id uuid references cm_inquiries(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  review_text text,
  is_hidden boolean not null default false,   -- soft-hide pending takedown review (Section 9 of spec)
  hidden_reason text,
  created_at timestamptz not null default now(),
  unique (cook_id, client_id)   -- one review per client per cook
);

create index idx_cm_reviews_cook_id on cm_reviews(cook_id);

-- ---------------------------------------------------------------------
-- 7. SUBSCRIPTIONS (cook listing billing status)
-- ---------------------------------------------------------------------
create table cm_subscriptions (
  id uuid primary key default gen_random_uuid(),
  cook_id uuid not null unique references cm_cooks(id) on delete cascade,
  status text not null check (
    status in ('trialing', 'active', 'past_due', 'grace_period', 'canceled', 'delisted')
  ),
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_start_at timestamptz not null default now(),
  trial_end_at timestamptz not null,             -- trial_start_at + 3 months, set at signup
  current_period_end timestamptz,
  grace_period_ends_at timestamptz,              -- set when a charge fails; +7 days
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cm_subscriptions_status on cm_subscriptions(status);

-- ---------------------------------------------------------------------
-- 8. ADMIN USERS
-- Simple allowlist table for the minimal admin dashboard
-- (billing status view + listing/review removal only).
-- ---------------------------------------------------------------------
create table cm_admins (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

alter table cm_cooks enable row level security;
alter table cm_cook_media enable row level security;
alter table cm_packages enable row level security;
alter table cm_clients enable row level security;
alter table cm_inquiries enable row level security;
alter table cm_reviews enable row level security;
alter table cm_subscriptions enable row level security;
alter table cm_admins enable row level security;

-- Helper: is the current user an admin?
create or replace function cm_is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from cm_admins where id = auth.uid());
$$;

-- --- cm_cooks -----------------------------------------------------
-- Public can view active cook profiles (this is a directory).
create policy cm_cooks_public_select
  on cm_cooks for select
  using (is_active = true or auth.uid() = id or cm_is_admin());

-- A cook can update only their own profile.
create policy cm_cooks_self_update
  on cm_cooks for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- A cook can insert only their own row (id must match auth.uid()).
create policy cm_cooks_self_insert
  on cm_cooks for insert
  with check (auth.uid() = id);

-- Admins can update any row (e.g. deactivate for abuse).
create policy cm_cooks_admin_update
  on cm_cooks for update
  using (cm_is_admin());

-- --- cm_cook_media --------------------------------------------------
create policy cm_cook_media_public_select
  on cm_cook_media for select
  using (true);

create policy cm_cook_media_owner_write
  on cm_cook_media for all
  using (auth.uid() = cook_id)
  with check (auth.uid() = cook_id);

-- --- cm_packages ------------------------------------------------------
create policy cm_packages_public_select
  on cm_packages for select
  using (true);

create policy cm_packages_owner_write
  on cm_packages for all
  using (auth.uid() = cook_id)
  with check (auth.uid() = cook_id);

-- --- cm_clients ---------------------------------------------------
-- A client can see and edit only their own row.
create policy cm_clients_self_select
  on cm_clients for select
  using (auth.uid() = id or cm_is_admin());

-- Covers an already-authenticated returning client inserting their own
-- row directly. The far more common path — a first-time guest
-- submitting an inquiry — is handled server-side by an Edge Function
-- using the service role key, which bypasses RLS entirely (see AUTH
-- FLOW section below), since the client has no session yet at that point.
create policy cm_clients_self_insert
  on cm_clients for insert
  with check (auth.uid() = id);

create policy cm_clients_self_update
  on cm_clients for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- --- cm_inquiries ---------------------------------------------------
-- A cook can view inquiries sent to them.
create policy cm_inquiries_cook_select
  on cm_inquiries for select
  using (auth.uid() = cook_id or auth.uid() = client_id or cm_is_admin());

-- Two valid insert paths:
--  1. Guest inquiry: the Edge Function uses the service role key, which
--     bypasses RLS entirely — this policy is not evaluated for that path.
--  2. Returning, already-authenticated client submitting a new inquiry
--     directly from the client app.
create policy cm_inquiries_insert
  on cm_inquiries for insert
  with check (auth.uid() = client_id);

-- --- cm_reviews -------------------------------------------------------
-- Public can see reviews that aren't hidden; cook can see all their own
-- reviews (including hidden, for transparency); admins see everything.
create policy cm_reviews_public_select
  on cm_reviews for select
  using (is_hidden = false or auth.uid() = cook_id or cm_is_admin());

-- A client may only insert a review for a cook they've actually
-- messaged (enforced via existence check against cm_inquiries).
create policy cm_reviews_insert
  on cm_reviews for insert
  with check (
    auth.uid() = client_id
    and exists (
      select 1 from cm_inquiries i
      where i.cook_id = cm_reviews.cook_id
        and i.client_id = auth.uid()
    )
  );

-- Only admins can hide/unhide reviews (notice-and-takedown enforcement).
create policy cm_reviews_admin_update
  on cm_reviews for update
  using (cm_is_admin());

-- --- cm_subscriptions -------------------------------------------------
-- A cook can view only their own subscription status.
create policy cm_subscriptions_cook_select
  on cm_subscriptions for select
  using (auth.uid() = cook_id or cm_is_admin());

-- Writes to subscriptions happen via the backend/Stripe webhook using
-- the service role key, bypassing RLS — no direct client insert/update
-- policy is granted here by design.

-- --- cm_admins ----------------------------------------------------
-- Only existing admins can view the admin list; no self-service inserts
-- (admin accounts are provisioned manually/via service role).
create policy cm_admins_select
  on cm_admins for select
  using (cm_is_admin());

-- =====================================================================
-- AUTH FLOW: GUEST-FIRST, AUTO-CREATED ACCOUNT VIA MAGIC LINK
-- =====================================================================
-- Client never sees a signup form. They fill out an inquiry (name,
-- email, phone, message) on a cook's profile page. Everything else
-- happens server-side, in a Supabase/Netlify Edge Function running
-- with the SERVICE ROLE KEY (never exposed to the browser).
--
-- Step-by-step:
--
-- 1. Client submits the inquiry form (name, email, phone, message,
--    cook_id) to the Edge Function. No auth session exists yet.
--
-- 2. Edge Function looks up cm_clients by email:
--      select * from cm_clients where email = :email;
--
-- 3a. If NOT found — create the auth user first, then the client row:
--      const { data, error } = await supabaseAdmin.auth.admin
--        .createUser({ email, email_confirm: true });
--      -- data.user.id becomes the cm_clients.id
--      insert into cm_clients (id, full_name, email, phone)
--        values (:auth_user_id, :name, :email, :phone);
--
-- 3b. If found — reuse the existing cm_clients.id (repeat guest,
--     same email as a prior inquiry). No new auth user is created.
--
-- 4. Insert the inquiry, always with client_id populated:
--      insert into cm_inquiries
--        (cook_id, client_id, client_name, client_email, client_phone, message)
--        values (:cook_id, :client_id, :name, :email, :phone, :message);
--
-- 5. Trigger the magic link email so the client can access their
--    account without ever setting a password:
--      const { error } = await supabaseAdmin.auth.signInWithOtp({
--        email,
--        options: { emailRedirectTo: 'https://mealprepmarket.com.au/inbox' }
--      });
--    Stamp cm_inquiries.magic_link_sent_at = now().
--
-- 6. Separately, trigger the cook notification email (existing flow)
--    and stamp cm_inquiries.email_notification_sent_at = now().
--
-- 7. When the client clicks the magic link, Supabase Auth establishes
--    a session where auth.uid() = the cm_clients.id created in step 3.
--    From that point on, all standard RLS policies above apply
--    normally — the client can view their inquiries/threads and
--    submit a review for any cook they've messaged.
--
-- Notes:
-- - Using auth.admin.createUser + signInWithOtp (rather than passing a
--   password) means the client is never asked to set one — the first
--   login *is* the magic link.
-- - The unique constraint on cm_clients.email is what makes step 2/3b
--   safe: repeat guests always resolve to one account rather than
--   duplicating rows across multiple inquiries.
-- - If a client submits inquiries to several cooks before ever
--   clicking a magic link, all of those inquiries correctly link to
--   the same client_id, so once they do log in, they see every thread
--   and are eligible to review every cook they've contacted.

-- =====================================================================
-- SECURITY: PROTECT is_active FROM SELF-TOGGLING
-- =====================================================================
-- cm_cooks_self_update allows a cook to update their own row, which
-- includes is_active. Without this trigger, a cook could set
-- is_active = true directly and appear in search results without ever
-- completing Stripe checkout. This trigger forces is_active to false
-- on insert, and preserves the existing value on update, UNLESS the
-- request comes from the service role (Edge Functions / Stripe
-- webhook) or from an admin — the only two paths that should ever
-- change activation status.

create or replace function cm_protect_is_active()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    if not (auth.role() = 'service_role' or cm_is_admin()) then
      new.is_active := false;
    end if;
  elsif tg_op = 'UPDATE' then
    if not (auth.role() = 'service_role' or cm_is_admin()) then
      new.is_active := old.is_active;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_cm_cooks_protect_is_active
  before insert or update on cm_cooks
  for each row execute function cm_protect_is_active();

-- Practical effect: a cook can self-insert/self-update their profile
-- freely (name, bio, tags, packages, etc.) via the onboarding flow
-- without worrying about is_active at all — it's always forced to
-- false until the stripe-webhook function (running as service_role)
-- flips it true on a successful subscription.

-- =====================================================================
-- PHASE 2: ON-PLATFORM ORDERING & PAYMENTS (Stripe Connect Direct Charges)
-- =====================================================================
-- This is a deliberate reversal of the original "off-platform payment
-- only" decision (see spec Section 2/4 history). Money now flows
-- through the platform via Stripe Connect, with the connected
-- (vendor) account as merchant of record — Direct Charges, not
-- Destination Charges — so the "software directory only" disclaimer
-- shown at checkout matches what's actually happening structurally.

-- --- cm_packages: repurposed as real orderable menu items -----------
alter table cm_packages add column if not exists dietary_tags text[] not null default '{}';
alter table cm_packages add column if not exists is_available boolean not null default true;
-- indicative_price is now a real transactional price (still dollars,
-- numeric(10,2)); converted to cents at checkout time, not stored as
-- cents here, to keep editing/display simple for cooks.

-- --- cm_vendor_stripe_accounts ---------------------------------------
-- One row per cook, tracking their Stripe Connect Express account.
-- NO client-writable policy exists on this table at all (see RLS
-- below) — charges_enabled/payouts_enabled are only ever set by the
-- stripe-connect-webhook function running as service_role, mirroring
-- the same defense-in-depth principle as cm_protect_is_active: a cook
-- cannot self-declare themselves ready to accept payment.
create table cm_vendor_stripe_accounts (
  cook_id uuid primary key references cm_cooks(id) on delete cascade,
  stripe_connect_account_id text not null unique,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table cm_vendor_stripe_accounts enable row level security;

create policy cm_vendor_stripe_accounts_select
  on cm_vendor_stripe_accounts for select
  using (auth.uid() = cook_id or cm_is_admin());
-- No insert/update/delete policy for authenticated/anon roles —
-- writes happen exclusively via connect-onboarding-link and
-- stripe-connect-webhook, both running under the service role key.

-- --- cm_orders --------------------------------------------------------
-- Created server-side (service role) at checkout time, BEFORE
-- redirecting to Stripe, so customer details are captured immediately
-- and the webhook only ever needs to flip status — never construct an
-- order from scratch based on webhook payload alone.
create table cm_orders (
  id uuid primary key default gen_random_uuid(),
  cook_id uuid not null references cm_cooks(id) on delete cascade,
  client_id uuid references cm_clients(id) on delete set null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded', 'canceled')),
  currency text not null default 'aud',
  subtotal_amount numeric(10,2) not null,
  application_fee_amount numeric(10,2),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  delivery_address text,
  order_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cm_orders_cook_id on cm_orders(cook_id);
create index idx_cm_orders_client_id on cm_orders(client_id);
create index idx_cm_orders_created_at on cm_orders(created_at);

alter table cm_orders enable row level security;

create policy cm_orders_select
  on cm_orders for select
  using (auth.uid() = cook_id or auth.uid() = client_id or cm_is_admin());
-- No client insert/update policy — order creation and status
-- transitions (pending -> paid/failed/refunded) happen exclusively via
-- create-order-checkout and stripe-connect-webhook under service_role.
-- A client marking their own order "paid" must never be possible.

-- --- cm_order_items -----------------------------------------------
create table cm_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references cm_orders(id) on delete cascade,
  package_id uuid references cm_packages(id) on delete set null,
  item_name text not null,       -- snapshot at order time, survives menu edits/deletion
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  line_total numeric(10,2) not null
);

create index idx_cm_order_items_order_id on cm_order_items(order_id);

alter table cm_order_items enable row level security;

create policy cm_order_items_select
  on cm_order_items for select
  using (
    exists (
      select 1 from cm_orders o
      where o.id = cm_order_items.order_id
        and (o.cook_id = auth.uid() or o.client_id = auth.uid() or cm_is_admin())
    )
  );
-- No client write policy, same reasoning as cm_orders.

-- =====================================================================
-- NOTES (Phase 2)
-- =====================================================================
-- - Pricing is ALWAYS resolved server-side from cm_packages at
--   checkout time inside create-order-checkout, never trusted from the
--   client request body — a tampered client-submitted price must be
--   structurally impossible, not just validated.
-- - Platform application_fee_amount is a business decision, not a
--   technical one — the Edge Function below defaults to 10% (matching
--   the original spec's Phase 2 commission figure) but this is a
--   constant, easily changed, and should be confirmed as the actual
--   intended rate.
-- 1. Because this is a shared Supabase project with Cooks Express, every
--    table here is namespaced with the `cm_` prefix. Cooks Express tables
--    must use their own distinct prefix (e.g. `ce_`) so RLS policies and
--    foreign keys never cross between the two entities' data.
-- 2. Phase 1 note (superseded): originally no client-cook payment data
--    was stored, consistent with an off-platform-only model. Phase 2
--    above reverses this — cm_orders/cm_order_items now hold real
--    transaction data via Stripe Connect Direct Charges.
-- 3. Email notifications on `cm_inquiries` are fired by a Supabase Edge
--    Function (or Netlify function) triggered on insert, not stored as
--    application state beyond the `email_notification_sent_at` timestamp.
-- 4. `cm_reviews.is_hidden` + `hidden_reason` implement the soft-hide
--    step described in the spec's notice-and-takedown clause; a hard
--    delete is available to admins directly via the dashboard if needed.
