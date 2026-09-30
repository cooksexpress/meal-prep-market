// app/(public)/disclaimer/page.tsx

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Food Safety & Liability Disclaimer",
};

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8 border border-paprika/40 bg-paprika/5 p-4 font-mono text-xs text-paprika">
        DRAFT — pending review by an Australian marketplace/tech lawyer before public launch.
        Do not treat this as final legal text.
      </div>

      <h1 className="font-display text-4xl">Food Safety &amp; Liability Disclaimer</h1>
      <p className="mt-2 font-mono text-xs text-ink/50">Last updated — draft, unreleased</p>

      <div className="mt-8 space-y-6 text-ink/85">
        <section>
          <h2 className="font-display text-xl">Cooks are independent contractors</h2>
          <p className="mt-2">
            Every cook listed on Meal Prep Market operates their own independent
            business. They are not employees, agents, contractors, or representatives of
            Meal Prep Market in any capacity. Meal Prep Market does not direct,
            supervise, or control how a cook prepares, handles, or delivers food.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl">No verification of compliance</h2>
          <p className="mt-2">
            Meal Prep Market does not audit kitchens, inspect food handling practices, or
            independently verify any cook&rsquo;s licenses, food safety certifications, or
            insurance coverage. Each cook self-declares their compliance at signup. It is the
            responsibility of every cook to hold and maintain:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Any required food business license or food safety supervisor certification for the way they prepare and deliver food</li>
            <li>Public and products liability insurance</li>
            <li>Compliance with the Queensland Food Act 2006 and all other applicable food safety and business regulations</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl">Bookings and payment are off-platform</h2>
          <p className="mt-2">
            All booking terms, pricing, scheduling, and payment are arranged directly between a
            client and their chosen cook, entirely outside of Meal Prep Market. We do not
            process, hold, or guarantee any payment made in connection with a booking.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl">No liability for food safety incidents</h2>
          <p className="mt-2">
            Meal Prep Market is not responsible for, and disclaims all liability arising
            from, any food safety incident, illness, allergic reaction, injury, or dispute
            connected to a booking arranged through the platform. Clients with specific dietary
            needs or allergies should confirm directly with their cook that those needs can be
            safely accommodated before booking.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl">Reporting a concern</h2>
          <p className="mt-2">
            If you believe a cook&rsquo;s listing is inaccurate, misleading, or that a cook is
            operating without required compliance, contact us so we can review the listing under
            our moderation policy.
          </p>
        </section>
      </div>
    </div>
  );
}
