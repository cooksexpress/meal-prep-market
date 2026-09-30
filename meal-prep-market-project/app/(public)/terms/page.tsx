// app/(public)/terms/page.tsx
//
// Drafted directly from the finalized business-model decisions in
// cooks-marketplace-spec-v2.md. This is NOT a substitute for the
// lawyer review flagged as an open item in that spec — the banner
// below says so explicitly and should stay until that review happens.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8 border border-paprika/40 bg-paprika/5 p-4 font-mono text-xs text-paprika">
        DRAFT — pending review by an Australian marketplace/tech lawyer before public launch.
        Do not treat this as final legal text.
      </div>

      <h1 className="font-display text-4xl">Terms of Service</h1>
      <p className="mt-2 font-mono text-xs text-ink/50">Last updated — draft, unreleased</p>

      <div className="mt-8 space-y-6 text-ink/85">
        <section>
          <h2 className="font-display text-xl">1. What Meal Prep Market is</h2>
          <p className="mt-2">
            Meal Prep Market is an advertising directory that connects clients with
            independent cooks on the Gold Coast. We do not audit food safety practices, inspect
            kitchens, verify licenses or insurance, employ cooks, or process payment between
            clients and cooks. We are not a party to any booking arrangement made between a
            client and a cook.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl">2. Cook obligations</h2>
          <p className="mt-2">
            Cooks are independent contractors, not employees or agents of Meal Prep Market.
            By listing on the platform, a cook confirms they hold all licenses, registrations,
            food handling qualifications, and business/public liability insurance required for
            the way they prepare and deliver food, and that they remain solely responsible for
            their own compliance with Queensland and Australian law.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl">3. Client obligations</h2>
          <p className="mt-2">
            Clients are responsible for agreeing booking terms, pricing, and payment directly
            with their chosen cook. Meal Prep Market does not mediate, guarantee, or
            process any part of that arrangement.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl">4. Reviews</h2>
          <p className="mt-2">
            Reviews are user-generated content, not verified or endorsed by Cook&rsquo;s
            Marketplace. Only clients who have submitted a genuine inquiry to a cook may review
            them. Prohibited content includes unlawful, defamatory, or knowingly false
            statements, harassment, and content unrelated to the cook&rsquo;s service.
          </p>
          <p className="mt-2">
            Anyone may request removal of a review by identifying the specific review and the
            basis for removal. We may hide a review pending review and reserve the right to
            remove content that violates the above, without being obligated to adjudicate factual
            disputes between client and cook.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl">5. Subscriptions &amp; billing</h2>
          <p className="mt-2">
            Cook listings include a free trial period, after which continued listing requires a
            flat monthly subscription. Subscriptions are billed via Stripe. A lapsed payment
            triggers a grace period before a listing is removed from search.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl">6. Limitation of liability</h2>
          <p className="mt-2">
            To the maximum extent permitted by law, Meal Prep Market is not liable for
            any loss or damage arising from a booking, food safety incident, or dispute between
            a client and a cook. Nothing in these terms limits any right you may have under the
            Australian Consumer Law that cannot lawfully be excluded.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl">7. Changes to these terms</h2>
          <p className="mt-2">
            We may update these terms from time to time. Continued use of the platform after an
            update constitutes acceptance of the revised terms.
          </p>
        </section>
      </div>
    </div>
  );
}
