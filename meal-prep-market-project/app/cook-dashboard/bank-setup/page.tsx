// app/cook-dashboard/bank-setup/page.tsx
//
// Dashboard Screen 1. Status is read directly from
// cm_vendor_stripe_accounts.charges_enabled — which the cook cannot
// self-set (see schema RLS notes) — so "Connected" here always
// reflects what Stripe's webhook actually confirmed, not a client-side
// guess.

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function BankSetupPage() {
  const supabase = createClient();
  const [status, setStatus] = useState<"loading" | "connected" | "setup_required">("loading");
  const [redirecting, setRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("cm_vendor_stripe_accounts")
        .select("charges_enabled")
        .eq("cook_id", user.id)
        .maybeSingle();

      setStatus(data?.charges_enabled ? "connected" : "setup_required");
    }
    load();
  }, [supabase]);

  async function handleStartSetup() {
    setRedirecting(true);
    setErrorMessage(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setRedirecting(false);
      setErrorMessage("Your session expired — please log in again.");
      return;
    }

    const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL!;
    const res = await fetch(`${functionsUrl}/connect-onboarding-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const body = await res.json();

    if (!res.ok || !body.url) {
      setRedirecting(false);
      setErrorMessage(body?.error ?? "Couldn't start bank setup. Please try again.");
      return;
    }

    window.location.href = body.url;
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="font-display text-3xl">Bank setup</h1>
        <p className="mt-1 text-ink/70">
          Connect your Australian bank account so customer payments go directly to you.
        </p>
      </div>

      {status === "loading" && <p className="text-ink/60">Loading…</p>}

      {status !== "loading" && (
        <div
          className={`border p-6 ${
            status === "connected" ? "border-ocean/40 bg-ocean/5" : "border-paprika/40 bg-paprika/5"
          }`}
        >
          <p className={`font-display text-xl ${status === "connected" ? "text-ocean" : "text-paprika"}`}>
            {status === "connected" ? "Connected" : "Setup required"}
          </p>
          <p className="mt-1 text-ink/80">
            {status === "connected"
              ? "Your bank account is linked. Customer payments settle directly to you."
              : "Link your BSB and account number to start accepting orders. Takes under 2 minutes."}
          </p>
        </div>
      )}

      {errorMessage && (
        <p role="alert" className="font-mono text-sm text-paprika">
          {errorMessage}
        </p>
      )}

      <button
        onClick={handleStartSetup}
        disabled={redirecting || status === "loading"}
        className="bg-paprika px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {redirecting
          ? "Redirecting…"
          : status === "connected"
          ? "Update bank details"
          : "Connect bank account"}
      </button>
    </div>
  );
}
