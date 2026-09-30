// app/onboarding/complete/page.tsx
//
// Stripe redirects here after checkout. The subscription.created
// webhook is what actually flips is_active to true — that may land a
// few seconds after this page renders, so this is deliberately framed
// as "you're set up" rather than "you're live", since the listing
// might not be publicly visible in search for a brief moment yet.

import Link from "next/link";

export default function OnboardingCompletePage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <p className="font-display text-3xl text-ocean">You&rsquo;re all set up</p>
      <p className="mt-3 text-ink/70">
        Your trial has started and your listing is being activated — this usually takes just a
        few seconds. You&rsquo;ll start receiving inquiries by email as clients find you.
      </p>
      <Link
        href="/cook-dashboard"
        className="mt-8 inline-block bg-paprika px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90"
      >
        Go to your dashboard
      </Link>
    </main>
  );
}
