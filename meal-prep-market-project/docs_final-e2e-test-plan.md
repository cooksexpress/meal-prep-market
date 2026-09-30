# Cook's Marketplace — Final Consolidated E2E Test Plan

Four parts, run in order against a staging Supabase project + Stripe test
mode + real (or Inbucket) email delivery. Parts 2 and 3 build on the
earlier `backend-test-checklist.md` and `onboarding-billing-test-checklist.md`
— rather than repeating every query, this plan cross-references what's
already proven and adds the checks specific to surfaces built since
(dashboard, admin). Run those two checklists in full first if you
haven't already; this pass assumes they're green.

---

## PART 1 — Public Discovery

### 1.1 Search & filtering
- [ ] `/cooks` loads with no filters, shows all `is_active = true` cooks
- [ ] Filtering by tier (In-Home / Delivery) returns only matching cooks
- [ ] Filtering by cuisine tag returns only cooks with that tag
- [ ] Filtering by dietary specialty returns only cooks with that tag
- [ ] Setting a max price excludes cooks whose `price_range_min` exceeds it
- [ ] Combining multiple filters (tier + cuisine + price) narrows correctly
- [ ] Filter state persists in the URL (`?tier=...&cuisine=...`) and a
      shared/bookmarked URL reproduces the same results
- [ ] Zero-result state renders the empty-state message, not a blank grid
- [ ] `CookCard` shows correct average rating and review count (spot-check
      against a manual `select avg(rating), count(*) from cm_reviews
      where cook_id = '...' and is_hidden = false`)

### 1.2 Cook profile page
- [ ] `/cooks/[cookId]` renders for an active cook: header, gallery,
      packages, reviews, inquiry form all present
- [ ] `/cooks/[cookId]` for an **inactive/delisted** cook returns 404
      (confirms the `.eq("is_active", true)` filter in `getCookProfileData`
      is actually working, not just cosmetic)
- [ ] `/cooks/[cookId]` for a nonexistent id returns 404
- [ ] Page `<title>` and meta description are cook-specific
      (`generateMetadata` — view page source to confirm, not just the
      rendered `<h1>`)
- [ ] Hidden reviews (`is_hidden = true`) do NOT appear in `ReviewList`

### 1.3 Guest inquiry submission
- [ ] Submitting the inquiry form with valid data shows the "Inquiry
      sent" confirmation state (not a redirect)
- [ ] Submitting with an invalid email is rejected client-side before
      hitting the network
- [ ] Submitting against an inactive cook's id directly via the API
      (bypassing the UI, since a 404 page has no form) returns the
      expected 404 from `submit-inquiry`

---

## PART 2 — Client Auth & Inbox

Covered in depth by `backend-test-checklist.md` Sections 1–5. New checks
specific to the actual pages (not just the Edge Function) below.

- [ ] Clicking the magic link redirects through `/auth/callback` and
      lands on `/inbox` with a live session
- [ ] An invalid/expired magic link redirects to `/?auth_error=1`
      rather than silently landing on a broken gated page
- [ ] `/inbox` lists every inquiry the client has sent, newest first
- [ ] `/inbox` for a client with zero inquiries shows the empty state
      with a working "Browse cooks" link
- [ ] `/inbox/[inquiryId]` for **another client's** inquiry id returns
      404 (confirms the explicit `.eq("client_id", user.id)` filter,
      not just RLS, since RLS alone would return null and should still
      404 cleanly)
- [ ] `ThreadDetail` shows the cook's `public_contact_email`, not their
      private login email
- [ ] `ReviewForm` renders when no review exists yet for that cook/client
      pair, and is replaced by "You've already left a review" once one
      does
- [ ] Attempting to visit `/inbox` or `/inbox/[id]` while logged out
      redirects to `/` (middleware gate)

---

## PART 3 — Billing Gate Rigidity

Fully covered by `onboarding-billing-test-checklist.md` — re-run that
checklist's 8 sections here as-is. New checks below verify the
**dashboard correctly reflects** whatever state that checklist put the
subscription into, closing the loop between backend state and UI.

- [ ] After Section 6 of the billing checklist (webhook activation),
      `/cook-dashboard` shows `SubscriptionStatusCard` status = "Free
      trial" with the correct days-remaining count
- [ ] After manually setting `status = 'grace_period'` (billing
      checklist Section 9 setup), the dashboard card switches to the
      "Payment issue" paprika-toned state with correct days-remaining
- [ ] After the cron sweep delists a cook (billing checklist Section 9),
      `/cook-dashboard` still loads (doesn't crash for a delisted cook)
      and shows the "Delisted" state
- [ ] A delisted cook's profile (`/cooks/[cookId]`) 404s for public
      visitors (re-confirms Part 1.2's inactive-cook check, now via a
      real subscription lifecycle instead of a manually seeded row)
- [ ] "Manage billing in Stripe" button successfully opens a real
      Stripe billing portal session (test mode) and returns to
      `/cook-dashboard/billing` afterward

---

## PART 4 — Dashboard & Admin Overrides

All new surfaces — no prior checklist covers these yet.

### 4.1 Cook dashboard
- [ ] `/cook-dashboard` overview shows correct business name, live/hidden
      status, subscription card, and up to 5 most recent inquiries
- [ ] `/cook-dashboard/inquiries` shows the full list (not just 5), with
      working `mailto:`/`tel:` links
- [ ] `/cook-dashboard/profile`:
  - [ ] Business name edits save and persist on reload
  - [ ] Tier displays correctly and is NOT editable (no input control)
  - [ ] Adding a gallery photo uploads successfully and appears
        immediately without a page reload
  - [ ] Removing a gallery photo deletes both the DB row and the
        underlying storage object (verify via `select * from
        storage.objects where name like '<cook_id>/%'` before/after)
  - [ ] Adding a package appears in the list immediately
  - [ ] Removing a package removes it immediately
  - [ ] Saving the profile form (bio/tags/price/contact) shows an
        inline "Saved" state — **does NOT redirect** (this was the bug
        caught and fixed when the component was reused from onboarding;
        re-verify it didn't regress)
- [ ] A logged-in **client** (not a cook) attempting to visit
      `/cook-dashboard/*` — confirm behavior is sane (either redirected,
      or lands on a page that 404s/redirects due to missing `cm_cooks`
      row rather than crashing)

### 4.2 Admin billing overview
- [ ] `/admin` lists every cook with accurate `is_active` status and
      subscription status/dates, matching direct SQL queries
- [ ] A non-admin authenticated user (cook or client) visiting `/admin`
      is redirected away (middleware's `cm_admins` check)
- [ ] A logged-out visitor visiting `/admin` is redirected to `/`

### 4.3 Admin moderation
- [ ] Search filters the cook list by name correctly
- [ ] "Deactivate listing" on an active cook:
  - [ ] Sets `is_active = false` immediately (verify in SQL)
  - [ ] Cook disappears from `/cooks` search within the same
        page load cycle (revalidation working)
  - [ ] Cook's profile page now 404s for public visitors
- [ ] "Reactivate listing" reverses all of the above
- [ ] Search filters the review list by cook name or review text
- [ ] "Hide review" with a reason:
  - [ ] Sets `is_hidden = true` and stores the reason
  - [ ] Review disappears from the cook's public profile immediately
  - [ ] Review still shows to the reviewing client in their own
        `/inbox/[inquiryId]` (per RLS: cook and admin can still see
        hidden reviews, this is intentional — confirm it's not
        accidentally hidden from everyone)
- [ ] "Restore review" reverses the above

### 4.4 Server Action authorization (the part that matters most here)

Admin actions run under the admin's own session, not service role — RLS
is the actual authorization boundary. Prove it directly:

- [ ] As an authenticated **cook** (not an admin), attempt to call
      `deactivateCook` or `hideReview` directly (e.g. via browser dev
      tools invoking the server action, or a raw fetch to the action's
      endpoint if using a form POST) — confirm it fails, since
      `cm_cooks_admin_update` / `cm_reviews_admin_update` policies both
      require `cm_is_admin()`, which a cook does not satisfy
- [ ] Remove a test admin's row from `cm_admins`, then attempt the same
      action while they still hold a valid session token — confirm it
      now fails too, proving authorization is live-checked against the
      table, not cached in the session

---

## Sign-off

Once all four parts pass cleanly on staging, the application is ready
for the pre-launch checklist and production deployment. Any failing
checkbox here should block that move — these are the last checks before
real cooks and real client data enter the system.
