// supabase/functions/create-order-checkout/index.ts
//
// POST /functions/v1/create-order-checkout
// Public endpoint (checkout is a guest flow) using the ANON KEY only.
// Reuses the exact guest-first magic-link account pattern from
// submit-inquiry, so a customer who orders gets the same passwordless
// account/order-history access as an inquiry.
//
// CRITICAL: line item prices are resolved from cm_packages in this
// function, server-side, using the SERVICE ROLE client — never taken
// from the request body. A tampered client-submitted price is
// structurally impossible here, not just rejected by validation.
//
// Uses Stripe Connect DIRECT CHARGES ({stripeAccount: ...} request
// option), not destination charges — the connected (vendor) account
// is the merchant of record, matching the "we're software only"
// checkout disclaimer.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@16?target=deno";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://mealprepmarket.com.au";

// Business decision, not a technical one — defaulting to the 10%
// figure from the original spec's Phase 2 commission plan. Change
// this constant if the actual intended rate differs.
const PLATFORM_FEE_PERCENT = 10;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  package_id: string;
  quantity: number;
}

interface OrderPayload {
  cook_id: string;
  items: CartItem[];
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  delivery_address?: string;
  order_notes?: string;
}

function isValidPayload(body: unknown): body is OrderPayload {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.cook_id === "string" &&
    Array.isArray(b.items) &&
    b.items.length > 0 &&
    b.items.every(
      (i) =>
        typeof i === "object" &&
        i !== null &&
        typeof (i as CartItem).package_id === "string" &&
        Number.isInteger((i as CartItem).quantity) &&
        (i as CartItem).quantity > 0
    ) &&
    typeof b.customer_name === "string" &&
    b.customer_name.trim().length > 0 &&
    typeof b.customer_email === "string" &&
    /\S+@\S+\.\S+/.test(b.customer_email)
  );
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!isValidPayload(body)) {
    return new Response(JSON.stringify({ error: "Missing or invalid fields" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const {
    cook_id,
    items,
    customer_name,
    customer_email,
    customer_phone,
    delivery_address,
    order_notes,
  } = body;
  const normalizedEmail = customer_email.trim().toLowerCase();

  try {
    // 1. Confirm the cook can actually accept payment.
    const { data: vendorAccount, error: vendorError } = await supabaseAdmin
      .from("cm_vendor_stripe_accounts")
      .select("stripe_connect_account_id, charges_enabled")
      .eq("cook_id", cook_id)
      .maybeSingle();

    if (vendorError || !vendorAccount || !vendorAccount.charges_enabled) {
      return new Response(
        JSON.stringify({ error: "This cook isn't set up to accept payments yet." }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // 2. Resolve real prices server-side. Only available items
    //    belonging to THIS cook are valid — a package_id for a
    //    different cook or a sold-out item is rejected outright.
    const packageIds = items.map((i) => i.package_id);
    const { data: packages, error: packagesError } = await supabaseAdmin
      .from("cm_packages")
      .select("id, name, indicative_price, is_available")
      .eq("cook_id", cook_id)
      .in("id", packageIds);

    if (packagesError) throw packagesError;

    const packageById = new Map((packages ?? []).map((p) => [p.id, p]));
    const lineItems: { package_id: string; name: string; unitPrice: number; quantity: number }[] = [];

    for (const cartItem of items) {
      const pkg = packageById.get(cartItem.package_id);
      if (!pkg || !pkg.is_available || pkg.indicative_price == null) {
        return new Response(
          JSON.stringify({ error: "One or more items in your order are no longer available." }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      lineItems.push({
        package_id: pkg.id,
        name: pkg.name,
        unitPrice: pkg.indicative_price,
        quantity: cartItem.quantity,
      });
    }

    const subtotal = lineItems.reduce((sum, li) => sum + li.unitPrice * li.quantity, 0);
    const applicationFeeAmount = Math.round(subtotal * (PLATFORM_FEE_PERCENT / 100) * 100); // cents

    // 3. Guest-first client account — identical pattern to
    //    submit-inquiry: look up by email, create if new, reuse if not.
    const { data: existingClient } = await supabaseAdmin
      .from("cm_clients")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    let clientId: string;
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: { full_name: customer_name },
      });
      if (createError || !created?.user) throw createError ?? new Error("Failed to create auth user");
      clientId = created.user.id;

      const { error: insertClientError } = await supabaseAdmin.from("cm_clients").insert({
        id: clientId,
        full_name: customer_name,
        email: normalizedEmail,
        phone: customer_phone ?? null,
      });
      if (insertClientError) throw insertClientError;
    }

    // 4. Create the order row FIRST (status: pending) so we have a
    //    stable id and full customer detail captured before Stripe is
    //    ever involved — the webhook only ever needs to flip status.
    const { data: order, error: orderError } = await supabaseAdmin
      .from("cm_orders")
      .insert({
        cook_id,
        client_id: clientId,
        status: "pending",
        subtotal_amount: subtotal,
        application_fee_amount: applicationFeeAmount / 100,
        customer_name,
        customer_email: normalizedEmail,
        customer_phone: customer_phone ?? null,
        delivery_address: delivery_address ?? null,
        order_notes: order_notes ?? null,
      })
      .select("id")
      .single();

    if (orderError || !order) throw orderError ?? new Error("Failed to create order");

    const { error: itemsError } = await supabaseAdmin.from("cm_order_items").insert(
      lineItems.map((li) => ({
        order_id: order.id,
        package_id: li.package_id,
        item_name: li.name,
        unit_price: li.unitPrice,
        quantity: li.quantity,
        line_total: li.unitPrice * li.quantity,
      }))
    );
    if (itemsError) throw itemsError;

    // 5. Create the Stripe Checkout Session as a DIRECT CHARGE — note
    //    the {stripeAccount} request option, not transfer_data. The
    //    vendor's connected account is the merchant of record.
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: normalizedEmail,
        line_items: lineItems.map((li) => ({
          price_data: {
            currency: "aud",
            product_data: { name: li.name },
            unit_amount: Math.round(li.unitPrice * 100),
          },
          quantity: li.quantity,
        })),
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          metadata: { order_id: order.id, cook_id },
        },
        metadata: { order_id: order.id, cook_id },
        success_url: `${SITE_URL}/order/complete?order_id=${order.id}`,
        cancel_url: `${SITE_URL}/cooks/${cook_id}?order_canceled=1`,
      },
      { stripeAccount: vendorAccount.stripe_connect_account_id }
    );

    await supabaseAdmin
      .from("cm_orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", order.id);

    // 6. Fire the same magic link pattern as submit-inquiry, so the
    //    customer can view order history passwordlessly afterward.
    await supabaseAdmin.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: `${SITE_URL}/auth/callback?redirect_to=/inbox` },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-order-checkout error:", err);
    return new Response(JSON.stringify({ error: "Could not start checkout. Please try again." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
