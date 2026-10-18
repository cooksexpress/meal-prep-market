// app/onboarding/page.tsx
//
// Public entry point for new cooks. They enter their email and get a
// sign-in link plus a code (see components/auth/EmailCodeSignIn). Once
// signed in they continue setup, or go to their dashboard if they're
// already listed. This page stays outside the auth gate (see
// lib/supabase/middleware.ts).

import { EmailCodeSignIn } from "@/components/auth/EmailCodeSignIn";

export default function OnboardingEntryPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-4xl">List your cooking on Meal Prep Market</h1>
      <p className="mt-3 text-ink/70">
        Free to list for your first 3 months, no card needed. No password either: we&rsquo;ll
        email you a code to get started.
      </p>
      <div className="mt-8">
        <EmailCodeSignIn mode="signup" />
      </div>
    </main>
  );
}
