// supabase/functions/connect-onboarding-link/index.ts
//
// POST /functions/v1/connect-onboarding-link
// Creates (or reuses) a Stripe Connect Express account for the calling
// cook and returns a fresh Account Link URL to send them to Stripe's
// hosted onboarding — this is Dashboard Screen 1 ("Bank Setup").
//
// Caller identity comes from their own access token, same pattern as
// create-checkout-session/create-portal-session — never trust a
// client-supplied cook_id.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@16?target=deno";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://mealprepmarket.com.au";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

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
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: existing } = await supabaseAdmin
      .from("cm_vendor_stripe_accounts")
      .select("stripe_connect_account_id")
      .eq("cook_id", cookId)
      .maybeSingle();

    let connectAccountId = existing?.stripe_connect_account_id;

    if (!connectAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "AU",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
      });

      connectAccountId = account.id;

      const { error: insertError } = await supabaseAdmin
        .from("cm_vendor_stripe_accounts")
        .insert({ cook_id: cookId, stripe_connect_account_id: connectAccountId });

      if (insertError) throw insertError;
    }

    // Account Links are single-use and short-lived — always issue a
    // fresh one, whether this is first-time or resumed onboarding.
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: `${SITE_URL}/cook-dashboard/bank-setup?refresh=1`,
      return_url: `${SITE_URL}/cook-dashboard/bank-setup?return=1`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("connect-onboarding-link error:", err);
    return new Response(JSON.stringify({ error: "Could not start bank setup. Please try again." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
