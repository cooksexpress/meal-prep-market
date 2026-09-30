// app/(public)/privacy/page.tsx

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8 border border-paprika/40 bg-paprika/5 p-4 font-mono text-xs text-paprika">
        DRAFT — pending review by an Australian marketplace/tech lawyer before public launch.
        Do not treat this as final legal text.
      </div>

      <h1 className="font-display text-4xl">Privacy Policy</h1>
      <p className="mt-2 font-mono text-xs text-ink/50">Last updated — draft, unreleased</p>

      <div className="mt-8 space-y-6 text-ink/85">
        <section>
          <h2 className="font-display text-xl">1. What we collect</h2>
          <p className="mt-2">
            When you submit an inquiry as a client, we collect your name, email address, phone
            number (optional), and the message you send to a cook. When you sign up as a cook, we
            additionally collect your business details, profile content, and billing information
            (handled by Stripe — we don&rsquo;t store card numbers ourselves).
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl">2. How accounts work — magic link authentication</h2>
          <p className="mt-2">
            Meal Prep Market does not use passwords. When you submit an inquiry as a
            guest, we automatically create an account tied to your email address and send you a
            one-time login link (&ldquo;magic link&rdquo;) so you can view your inquiry history
            without setting up credentials. Repeat inquiries using the same email are linked to
            the same account rather than creating duplicates. Your login email is private — it is
            never shown publicly, including to the cooks you contact.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl">3. What we share with cooks</h2>
          <p className="mt-2">
            When you submit an inquiry, the name, email, phone number, and message you provide
            are shared directly with that cook so they can respond to you. This is the extent of
            what is shared — we do not sell or share your data with third parties for marketing
            purposes.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl">4. What&rsquo;s public</h2>
          <p className="mt-2">
            Cook profiles (name, bio, photos, packages, and reviews) are public and indexable by
            search engines. Client reviews you submit, including your star rating and any written
            text, are shown publicly on the relevant cook&rsquo;s profile.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl">5. Data storage &amp; security</h2>
          <p className="mt-2">
            Data is stored in Supabase (PostgreSQL) with row-level security restricting access to
            your own records. Payment information for cook subscriptions is handled entirely by
            Stripe; we never see or store full card details.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl">6. Your rights</h2>
          <p className="mt-2">
            You can request access to, correction of, or deletion of your personal information by
            contacting us. Deleting your account removes your inquiry history but does not
            retroactively remove reviews you&rsquo;ve already published, consistent with our
            review moderation policy in the Terms of Service.
          </p>
        </section>
      </div>
    </div>
  );
}
