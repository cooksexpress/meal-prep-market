// supabase/functions/stripe-webhook/index.ts
//
// POST /functions/v1/stripe-webhook
// Public endpoint (Stripe calls this directly), but every request is
// verified against the raw body + Stripe-Signature header before any
// data is trusted. Handles the cook's own listing subscription only —
// there is no client-cook payment flow in this system.
//
// Events handled:
//   customer.subscription.created
//   customer.subscription.updated
//   customer.subscription.deleted
//   invoice.payment_failed
//   invoice.payment_succeeded
//
// State machine (cm_subscriptions.status):
//   trialing -> active            (trial converts / first payment succeeds)
//   active -> past_due            (invoice.payment_failed)
//   past_due -> grace_period      (payment_failed sets grace_period_ends_at = now()+7d)
//   grace_period -> active        (invoice.payment_succeeded before grace period ends)
//   grace_period -> delisted      (cron sweep finds grace_period_ends_at < now(); see
//                                   the separate delist-expired-cooks cron function)
//   any -> canceled               (customer.subscription.deleted)
//
// cm_cooks.is_active mirrors this: true for trialing/active/grace_period,
// false for past_due (no — see note below), canceled, delisted.
// NOTE: past_due keeps is_active = true because the grace period is the
// whole point — a cook shouldn't be delisted the instant a card fails,
// only after the 7-day window actually expires.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@16?target=deno";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const GRACE_PERIOD_DAYS = 7;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// metadata.cook_id is the PRIMARY source of truth for mapping any
// subscription-related event back to a cook. Every subscription must be
// created with `metadata: { cook_id }` on the Stripe side. Invoice
// events don't carry subscription metadata directly, so for those we
// retrieve the subscription from Stripe to read its metadata.
async function resolveCookId(
  subscription: Stripe.Subscription | string
): Promise<{ cookId: string; sub: Stripe.Subscription }> {
  const sub =
    typeof subscription === "string"
      ? await stripe.subscriptions.retrieve(subscription)
      : subscription;

  const cookId = sub.metadata?.cook_id;
  if (!cookId) {
    throw new Error(`Subscription ${sub.id} is missing metadata.cook_id`);
  }

  return { cookId, sub };
}

async function setSubscriptionAndCookStatus(
  cookId: string,
  subscriptionUpdates: Record<string, unknown>,
  isActive: boolean
) {
  const { error: subError } = await supabaseAdmin
    .from("cm_subscriptions")
    .update({ ...subscriptionUpdates, updated_at: new Date().toISOString() })
    .eq("cook_id", cookId);

  if (subError) throw subError;

  const { error: cookError } = await supabaseAdmin
    .from("cm_cooks")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", cookId);

  if (cookError) throw cookError;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing Stripe-Signature header", { status: 400 });
  }

  // Signature verification requires the RAW request body — do not
  // parse as JSON before this step.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Stripe signature verification failed:", err);
    return new Response(`Webhook signature verification failed`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        let cookId: string;

        try {
          ({ cookId } = await resolveCookId(sub));
        } catch (err) {
          console.error("subscription.created:", (err as Error).message);
          break;
        }

        // Upsert: this may be the first time we see this subscription,
        // or it may follow an earlier row created at trial start.
        const { error } = await supabaseAdmin.from("cm_subscriptions").upsert(
          {
            cook_id: cookId,
            status: sub.status === "trialing" ? "trialing" : "active",
            stripe_customer_id: sub.customer as string,
            stripe_subscription_id: sub.id,
            trial_start_at: sub.trial_start
              ? new Date(sub.trial_start * 1000).toISOString()
              : new Date().toISOString(),
            trial_end_at: sub.trial_end
              ? new Date(sub.trial_end * 1000).toISOString()
              : addDays(new Date(), 90),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            grace_period_ends_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "cook_id" }
        );

        if (error) throw error;

        await supabaseAdmin
          .from("cm_cooks")
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq("id", cookId);

        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        let cookId: string;

        try {
          ({ cookId } = await resolveCookId(sub));
        } catch (err) {
          console.error("subscription.updated:", (err as Error).message);
          break;
        }

        // Still read our current status (not derivable from metadata)
        // so an "updated" event doesn't accidentally clear a
        // grace_period that's still in progress.
        const { data: currentRow, error: fetchError } = await supabaseAdmin
          .from("cm_subscriptions")
          .select("status")
          .eq("cook_id", cookId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        let status = currentRow?.status ?? "active";
        if (sub.status === "trialing") status = "trialing";
        else if (sub.status === "active") status = "active";
        else if (sub.status === "canceled") status = "canceled";

        const isActive = ["trialing", "active", "grace_period"].includes(status);

        await setSubscriptionAndCookStatus(
          cookId,
          {
            status,
            stripe_customer_id: sub.customer as string,
            stripe_subscription_id: sub.id,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          },
          isActive
        );

        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        let cookId: string;

        try {
          ({ cookId } = await resolveCookId(sub));
        } catch (err) {
          console.error("subscription.deleted:", (err as Error).message);
          break;
        }

        await setSubscriptionAndCookStatus(
          cookId,
          { status: "canceled", grace_period_ends_at: null },
          false
        );

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId = invoice.subscription as string | null;
        if (!stripeSubscriptionId) break;

        let cookId: string;
        try {
          ({ cookId } = await resolveCookId(stripeSubscriptionId));
        } catch (err) {
          console.error("payment_failed:", (err as Error).message);
          break;
        }

        // Enter (or remain in) the grace period. is_active stays true —
        // the cook keeps their listing live for the full 7-day window.
        const graceEndsAt = addDays(new Date(), GRACE_PERIOD_DAYS);

        await setSubscriptionAndCookStatus(
          cookId,
          { status: "grace_period", grace_period_ends_at: graceEndsAt },
          true
        );

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId = invoice.subscription as string | null;
        if (!stripeSubscriptionId) break;

        let cookId: string;
        try {
          ({ cookId } = await resolveCookId(stripeSubscriptionId));
        } catch (err) {
          console.error("payment_succeeded:", (err as Error).message);
          break;
        }

        // Clears any grace period, whether or not one was active —
        // a clean successful payment always resolves to "active".
        await setSubscriptionAndCookStatus(
          cookId,
          { status: "active", grace_period_ends_at: null },
          true
        );

        break;
      }

      default:
        // Unhandled event type — acknowledge so Stripe doesn't retry.
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`stripe-webhook error handling ${event.type}:`, err);
    // Return 500 so Stripe retries — these are state-sync failures we
    // want retried, not silently dropped.
    return new Response(JSON.stringify({ error: "Internal error processing event" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
