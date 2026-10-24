// app/onboarding/page.tsx
//
// Public entry point for new cooks. They enter their email and get a
// sign-in link plus a code (see components/auth/EmailCodeSignIn). Once
// signed in they continue setup, or go to their dashboard if they're
// already listed. This page stays outside the auth gate (see
// lib/supabase/middleware.ts).

import { EmailCodeSignIn } from "@/components/auth/EmailCodeSignIn";

// A few reasons to join, shown right above the email box. Keep every
// line true: no customer numbers, no promise of ranking on Google.
const benefits = [
  "Free to join, no card needed",
  "Customers message you directly with their name, email and phone",
  "Your own page that Google can find",
  "Set up in minutes: a photo, dish name and price",
  "Pause orders any time you need a break",
];

export default function OnboardingEntryPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-4xl">Welcome, cooks</h1>
      <p className="mt-3 text-ink/70">
        It&rsquo;s free to join. Help the Gold Coast eat better, and get more meal prep customers.
      </p>

      <ul className="mt-6 space-y-2 rounded-2xl border border-gold/40 bg-gold/5 p-5">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-3 text-sm text-ink/85">
            <span className="font-display text-base leading-5 text-gold" aria-hidden="true">
              ✓
            </span>
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-ink/70">
        Enter your email to get your free listing, or to sign in to your listing. We&rsquo;ll
        email you a code, no password needed.
      </p>
      <div className="mt-6">
        <EmailCodeSignIn mode="signup" />
      </div>
    </main>
  );
}
