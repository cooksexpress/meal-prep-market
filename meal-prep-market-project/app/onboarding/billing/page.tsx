// app/onboarding/billing/page.tsx
//
// Final sign-up step. No card needed: this starts a 90-day free trial
// (cm_start_free_trial) and puts the listing live straight away. Cooks
// subscribe later from Dashboard > Billing. They get reminder emails
// 7 days and 1 day before the trial ends; if they don't subscribe, the
// listing is hidden (not deleted) until they do.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingFinishPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "starting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleStartTrial() {
    setStatus("starting");
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("cm_start_free_trial");

    if (error) {
      setStatus("error");
      setErrorMessage(
        error.message.includes("declaration")
          ? "Please accept the compliance declaration first (step 2)."
          : error.message.includes("profile")
          ? "Please finish your profile first (step 3)."
          : "Couldn't start your free trial. Please try again."
      );
      return;
    }

    router.push("/onboarding/complete");
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-wide text-ink/50">Step 4 of 4</p>
      <h1 className="mt-2 font-display text-3xl">Start your free trial</h1>
      <p className="mt-3 text-ink/70">
        Your listing is free for 90 days, and goes live as soon as you start. No card needed.
      </p>

      <ul className="mt-8 space-y-3 rounded-2xl border border-hairline bg-surface p-6 text-sm text-ink/80">
        <li>
          <span className="text-gold">✓</span> Free for 90 days, no card, no lock-in
        </li>
        <li>
          <span className="text-gold">✓</span> We&rsquo;ll email you 7 days and 1 day before your trial
          ends
        </li>
        <li>
          <span className="text-gold">✓</span> To stay listed after that, subscribe from your dashboard
          for a flat monthly fee
        </li>
        <li>
          <span className="text-gold">✓</span> If you don&rsquo;t, your listing is simply hidden. Your
          menu and photos stay saved for whenever you&rsquo;re ready
        </li>
      </ul>

      {status === "error" && (
        <p role="alert" className="mt-4 font-mono text-sm text-paprika">
          {errorMessage}
        </p>
      )}

      <button
        onClick={handleStartTrial}
        disabled={status === "starting"}
        className="mt-6 rounded-full bg-gold px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "starting" ? "Starting…" : "Start my free trial"}
      </button>
    </main>
  );
}
