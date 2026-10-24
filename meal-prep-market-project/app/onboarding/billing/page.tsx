// app/onboarding/billing/page.tsx
//
// Final sign-up step. Listing is free with no time limit and no card
// (migration 011). cm_start_free_trial puts the listing live straight
// away; the name is kept from when this was a 90-day trial.

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
          : "Couldn't put your listing live. Please try again."
      );
      return;
    }

    router.push("/onboarding/complete");
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-wide text-ink/50">Step 4 of 4</p>
      <h1 className="mt-2 font-display text-3xl">Put your listing live</h1>
      <p className="mt-3 text-ink/70">
        Joining Meal Prep Market is free. No card needed, and your listing goes live as soon as
        you tap the button.
      </p>

      <ul className="mt-8 space-y-3 rounded-2xl border border-hairline bg-surface p-6 text-sm text-ink/80">
        <li>
          <span className="text-gold">✓</span> Free to join, no card, no lock-in
        </li>
        <li>
          <span className="text-gold">✓</span> Customers message you directly, and you reply your own way
        </li>
        <li>
          <span className="text-gold">✓</span> Pause or update your listing any time from your dashboard
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
        {status === "starting" ? "Going live…" : "Put my listing live"}
      </button>
    </main>
  );
}
