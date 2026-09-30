// app/onboarding/billing/page.tsx

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingBillingPage() {
  const [status, setStatus] = useState<"idle" | "redirecting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleStartTrial() {
    setStatus("redirecting");
    setErrorMessage(null);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setStatus("error");
      setErrorMessage("Your session expired — please log in again.");
      return;
    }

    const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL!;
    const res = await fetch(`${functionsUrl}/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const body = await res.json();

    if (!res.ok || !body.url) {
      setStatus("error");
      setErrorMessage(body?.error ?? "Couldn't start checkout. Please try again.");
      return;
    }

    window.location.href = body.url;
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-wide text-ink/50">Step 4 of 4</p>
      <h1 className="mt-2 font-display text-3xl">Start your free trial</h1>
      <p className="mt-3 text-ink/70">
        Your listing is free for 90 days. After that, it&rsquo;s a flat monthly fee to stay listed —
        cancel anytime before your trial ends and you won&rsquo;t be charged.
      </p>

      <div className="mt-8 border border-hairline p-6">
        <p className="font-mono text-sm text-ink/70">You&rsquo;ll be taken to Stripe to add a card.</p>
        <p className="mt-1 font-mono text-sm text-ink/70">Nothing is charged during your 90-day trial.</p>
      </div>

      {status === "error" && (
        <p role="alert" className="mt-4 font-mono text-sm text-paprika">
          {errorMessage}
        </p>
      )}

      <button
        onClick={handleStartTrial}
        disabled={status === "redirecting"}
        className="mt-6 bg-paprika px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "redirecting" ? "Redirecting…" : "Start free trial"}
      </button>
    </main>
  );
}
