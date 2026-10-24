// app/cook-dashboard/billing/page.tsx
//
// Cooks without a Stripe subscription (free trial, or listing hidden
// after the trial) see "Subscribe", which opens Stripe Checkout. If
// they subscribe during the trial, Stripe doesn't charge until the
// trial's original end date. Subscribed cooks manage their card and
// invoices in the Stripe portal.

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  SubscriptionStatusCard,
  type SubscriptionStatus,
} from "@/components/cook-dashboard/SubscriptionStatusCard";

interface SubscriptionData {
  status: SubscriptionStatus;
  trial_end_at: string | null;
  grace_period_ends_at: string | null;
  stripe_subscription_id: string | null;
}

export default function CookDashboardBillingPage() {
  const supabase = createClient();
  const [justSubscribed, setJustSubscribed] = useState(false);

  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState<"idle" | "redirecting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setJustSubscribed(new URLSearchParams(window.location.search).get("subscribed") === "1");
  }, []);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("cm_subscriptions")
        .select("status, trial_end_at, grace_period_ends_at, stripe_subscription_id")
        .eq("cook_id", user.id)
        .maybeSingle();

      setSubscription(data);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function goToStripe(functionName: "create-checkout-session" | "create-portal-session") {
    setActionStatus("redirecting");
    setErrorMessage(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setActionStatus("error");
      setErrorMessage("Your session expired. Please log in again.");
      return;
    }

    const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL!;
    try {
      const res = await fetch(`${functionsUrl}/${functionName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const body = await res.json();

      if (!res.ok || !body.url) {
        setActionStatus("error");
        setErrorMessage(body?.error ?? "Couldn't open Stripe. Please try again.");
        return;
      }

      window.location.href = body.url;
    } catch {
      setActionStatus("error");
      setErrorMessage("Couldn't open Stripe. Please try again.");
    }
  }

  if (loading) {
    return <p className="text-ink/60">Loading…</p>;
  }

  const hasSubscription = Boolean(subscription?.stripe_subscription_id);
  // Free listings have nothing to pay for.
  const canSubscribe =
    subscription?.status !== "free" &&
    (!hasSubscription || subscription?.status === "canceled" || subscription?.status === "delisted");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Billing</h1>
        <p className="mt-1 text-ink/70">Your listing plan, and any card and invoices.</p>
      </div>

      {justSubscribed && (
        <p className="rounded-2xl border border-gold/40 bg-gold/5 p-4 text-sm text-ink/80">
          Thanks for subscribing! It can take a minute for the status below to update.
        </p>
      )}

      <SubscriptionStatusCard
        status={subscription?.status ?? null}
        trialEndAt={subscription?.trial_end_at ?? null}
        gracePeriodEndsAt={subscription?.grace_period_ends_at ?? null}
        hasSubscription={hasSubscription}
      />

      {errorMessage && (
        <p role="alert" className="font-mono text-sm text-paprika">
          {errorMessage}
        </p>
      )}

      {subscription && canSubscribe && (
        <div>
          <button
            onClick={() => goToStripe("create-checkout-session")}
            disabled={actionStatus === "redirecting"}
            className="rounded-full bg-gold px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {actionStatus === "redirecting" ? "Opening Stripe…" : "Subscribe"}
          </button>
          {subscription.status === "trialing" && (
            <p className="mt-2 text-sm text-ink/60">
              You won&rsquo;t be charged until your free trial ends.
            </p>
          )}
        </div>
      )}

      {hasSubscription && !canSubscribe && (
        <button
          onClick={() => goToStripe("create-portal-session")}
          disabled={actionStatus === "redirecting"}
          className="rounded-full border border-gold px-6 py-3 text-sm text-gold transition-colors hover:bg-gold hover:text-paper disabled:opacity-50"
        >
          {actionStatus === "redirecting" ? "Opening Stripe…" : "Manage card and invoices"}
        </button>
      )}
    </div>
  );
}
