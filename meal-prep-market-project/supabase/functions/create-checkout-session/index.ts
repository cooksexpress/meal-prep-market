// supabase/functions/create-checkout-session/index.ts
//
// POST /functions/v1/create-checkout-session
// Called from the frontend with the cook's own access token (not the
// anon key alone) — this function needs to know WHICH cook is
// checking out, which it gets by verifying the caller's JWT, not from
// a client-supplied cook_id (never trust the client for that mapping).
//
// Creates a Stripe Checkout Session in subscription mode with a
// 90-day trial. Critically, metadata.cook_id is set on
// subscription_data.metadata (NOT just the session), because that's
// what actually carries onto the resulting Subscription object — the
// stripe-webhook function reads cook_id from subscription metadata,
// not session metadata.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@16?target=deno";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_PRICE_ID = Deno.env.get("STRIPE_PRICE_ID")!; // the flat monthly listing price
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://mealprepmarket.com.au";
const TRIAL_DAYS = 90;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Verify the caller's own access token — this is how we know which
  // cook is checking out, not from anything the client body claims.
  const supabaseAsUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseAsUser.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const cookId = user.id;

  try {
    // Confirm the cook has actually completed onboarding steps 1–3
    // before letting them reach checkout.
    const { data: cook, error: cookError } = await supabaseAsUser
      .from("cm_cooks")
      .select("business_name, declaration_accepted")
      .eq("id", cookId)
      .single();

    if (cookError || !cook || !cook.declaration_accepted) {
      return new Response(
        JSON.stringify({ error: "Please complete your profile and declaration first" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Free trials start without a card (cm_start_free_trial), so a cook
    // may subscribe during their trial, after it ran out, or (rarely)
    // without ever starting one. Work out how much free time is left.
    const { data: existing, error: existingError } = await supabaseAsUser
      .from("cm_subscriptions")
      .select("status, trial_end_at, stripe_subscription_id")
      .eq("cook_id", cookId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (
      existing?.stripe_subscription_id &&
      ["trialing", "active", "past_due", "grace_period"].includes(existing.status)
    ) {
      return new Response(
        JSON.stringify({ error: "You're already subscribed. Use 'Manage card and invoices' instead." }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: { cook_id: cookId },
    };

    if (!existing) {
      subscriptionData.trial_period_days = TRIAL_DAYS;
    } else if (existing.status === "trialing" && existing.trial_end_at) {
      // Keep their original trial end date so they're never charged
      // early. Stripe needs a trial end at least 48 hours away; with
      // less than that left, billing simply starts now.
      const trialEndSeconds = Math.floor(new Date(existing.trial_end_at).getTime() / 1000);
      const minimumSeconds = Math.floor(Date.now() / 1000) + 48 * 60 * 60 + 300;
      if (trialEndSeconds > minimumSeconds) {
        subscriptionData.trial_end = trialEndSeconds;
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      subscription_data: subscriptionData,
      metadata: { cook_id: cookId },
      success_url: `${SITE_URL}/cook-dashboard/billing?subscribed=1`,
      cancel_url: `${SITE_URL}/cook-dashboard/billing?canceled=1`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return new Response(JSON.stringify({ error: "Could not start checkout. Please try again." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
