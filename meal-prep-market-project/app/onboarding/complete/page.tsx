// app/onboarding/complete/page.tsx
//
// Shown after the cook puts their free listing live (onboarding step 4).

import Link from "next/link";

export default function OnboardingCompletePage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <p className="font-display text-3xl text-gold">You&rsquo;re live!</p>
      <p className="mt-3 text-ink/70">
        Your free listing is up and clients can now find you. You&rsquo;ll get an email whenever
        someone sends you an inquiry or order.
      </p>
      <Link
        href="/cook-dashboard"
        className="mt-8 inline-block rounded-full bg-gold px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90"
      >
        Go to your dashboard
      </Link>
    </main>
  );
}
