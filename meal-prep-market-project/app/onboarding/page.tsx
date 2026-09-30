// app/onboarding/page.tsx
//
// Public entry point. A cook enters their email, gets a magic link
// (same passwordless pattern as clients), and lands on /onboarding/tier
// once they click it. This page itself stays outside the auth gate —
// see lib/supabase/middleware.ts.

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingEntryPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect_to=/onboarding/tier`,
      },
    });

    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="font-display text-2xl text-ocean">Check your email</p>
        <p className="mt-2 text-ink/70">
          We&rsquo;ve sent a link to {email} — click it to start setting up your listing.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-4xl">List your cooking on Meal Prep Market</h1>
      <p className="mt-3 text-ink/70">
        Free to list for your first 3 months. No password needed — we&rsquo;ll email you a link to
        get started.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="font-mono text-xs uppercase tracking-wide text-ink/70">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-hairline bg-paper px-3 py-2"
          />
        </div>

        {status === "error" && (
          <p role="alert" className="font-mono text-sm text-paprika">
            Something went wrong sending your link. Please try again.
          </p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="bg-paprika px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "submitting" ? "Sending…" : "Get started"}
        </button>
      </form>
    </main>
  );
}
