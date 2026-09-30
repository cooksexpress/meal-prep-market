// app/cook-dashboard/billing/page.tsx

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SubscriptionStatusCard } from "@/components/cook-dashboard/SubscriptionStatusCard";

interface SubscriptionData {
  status: "trialing" | "active" | "grace_period" | "canceled" | "delisted";
  trial_end_at: string | null;
  grace_period_ends_at: string | null;
}

export default function CookDashboardBillingPage() {
  const supabase = createClient();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalStatus, setPortalStatus] = useState<"idle" | "redirecting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("cm_subscriptions")
        .select("status, trial_end_at, grace_period_ends_at")
        .eq("cook_id", user.id)
        .maybeSingle();

      setSubscription(data);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleManageBilling() {
    setPortalStatus("redirecting");
    setErrorMessage(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setPortalStatus("error");
      setErrorMessage("Your session expired — please log in again.");
      return;
    }

    const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL!;
    const res = await fetch(`${functionsUrl}/create-portal-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const body = await res.json();

    if (!res.ok || !body.url) {
      setPortalStatus("error");
      setErrorMessage(body?.error ?? "Couldn't open billing portal.");
      return;
    }

    window.location.href = body.url;
  }

  if (loading) {
    return <p className="text-ink/60">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Billing</h1>
        <p className="mt-1 text-ink/70">Manage your subscription, payment method, and invoices.</p>
      </div>

      <SubscriptionStatusCard
        status={subscription?.status ?? null}
        trialEndAt={subscription?.trial_end_at ?? null}
        gracePeriodEndsAt={subscription?.grace_period_ends_at ?? null}
      />

      {errorMessage && (
        <p role="alert" className="font-mono text-sm text-paprika">
          {errorMessage}
        </p>
      )}

      <button
        onClick={handleManageBilling}
        disabled={portalStatus === "redirecting"}
        className="border border-ocean px-6 py-3 font-mono text-sm text-ocean transition-colors hover:bg-ocean hover:text-paper disabled:opacity-50"
      >
        {portalStatus === "redirecting" ? "Redirecting…" : "Manage billing in Stripe"}
      </button>
    </div>
  );
}
