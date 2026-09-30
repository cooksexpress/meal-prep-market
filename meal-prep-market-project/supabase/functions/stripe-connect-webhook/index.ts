// supabase/functions/stripe-connect-webhook/index.ts
//
// POST /functions/v1/stripe-connect-webhook
// Separate from stripe-webhook (which handles the cook's own SaaS
// subscription billing on the PLATFORM's Stripe account). This
// function is configured in the Stripe Dashboard as a CONNECT webhook
// ("listen to events on connected accounts"), with its OWN signing
// secret (STRIPE_CONNECT_WEBHOOK_SECRET) — do not reuse the
// subscription webhook's secret here, they are different endpoints.
//
// Events handled:
//   account.updated              — tracks onboarding/charges/payouts status
//   checkout.session.completed   — marks an order paid, sends emails
//   payment_intent.payment_failed — marks an order failed

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@16?target=deno";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_CONNECT_WEBHOOK_SECRET = Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("NOTIFICATIONS_FROM_EMAIL") ?? "notifications@mealprepmarket.com.au";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://mealprepmarket.com.au";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) console.error("Resend error:", await res.text());
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing Stripe-Signature header", { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      STRIPE_CONNECT_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Connect webhook signature verification failed:", err);
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  try {
    switch (event.type) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account;

        const { data: existing } = await supabaseAdmin
          .from("cm_vendor_stripe_accounts")
          .select("cook_id, onboarding_completed_at")
          .eq("stripe_connect_account_id", account.id)
          .maybeSingle();

        if (!existing) {
          console.error("account.updated: no matching row for", account.id);
          break;
        }

        const nowOnboarded = account.charges_enabled && account.payouts_enabled;

        await supabaseAdmin
          .from("cm_vendor_stripe_accounts")
          .update({
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            onboarding_completed_at:
              nowOnboarded && !existing.onboarding_completed_at
                ? new Date().toISOString()
                : existing.onboarding_completed_at,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_connect_account_id", account.id);

        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;

        if (!orderId) {
          console.error("checkout.session.completed missing order_id metadata");
          break;
        }

        const { data: order, error: orderFetchError } = await supabaseAdmin
          .from("cm_orders")
          .update({
            status: "paid",
            stripe_payment_intent_id: session.payment_intent as string,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId)
          .select("id, cook_id, customer_name, customer_email, order_notes, delivery_address")
          .single();

        if (orderFetchError || !order) {
          console.error("checkout.session.completed: order update failed", orderFetchError);
          break;
        }

        const { data: cook } = await supabaseAdmin
          .from("cm_cooks")
          .select("business_name, public_contact_email, public_contact_phone")
          .eq("id", order.cook_id)
          .single();

        const { data: orderItems } = await supabaseAdmin
          .from("cm_order_items")
          .select("item_name, quantity, line_total")
          .eq("order_id", order.id);

        const itemsHtml = (orderItems ?? [])
          .map((i) => `<li>${i.quantity} × ${i.item_name} — $${i.line_total.toFixed(2)}</li>`)
          .join("");

        // Notify the cook.
        if (cook) {
          const { data: cookAuthUser } = await supabaseAdmin.auth.admin.getUserById(order.cook_id);
          if (cookAuthUser?.user?.email) {
            await sendEmail(
              cookAuthUser.user.email,
              `New paid order from ${order.customer_name} — Meal Prep Market`,
              `<p>You have a new paid order.</p>
               <ul>${itemsHtml}</ul>
               <p><strong>Delivery/notes:</strong> ${order.order_notes ?? "—"}</p>
               <p><strong>Address:</strong> ${order.delivery_address ?? "—"}</p>
               <p>View full details in your <a href="${SITE_URL}/cook-dashboard/orders">dashboard</a>.</p>`
            );
          }

          // Receipt to the customer, with vendor contact details per
          // the required post-purchase contact display.
          await sendEmail(
            order.customer_email,
            `Your order from ${cook.business_name} — Meal Prep Market`,
            `<p>Thanks for your order!</p>
             <ul>${itemsHtml}</ul>
             <p>Need to adjust your order or delivery details? Contact ${cook.business_name}
             directly at ${cook.public_contact_phone ?? cook.public_contact_email ?? "the contact details on their profile"}.</p>
             <p style="color:#888;font-size:12px;">Meals and culinary services are prepared, sold,
             and provided directly by ${cook.business_name}. Meal Prep Market provides software
             tools and directory listing services only.</p>`
          );
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.order_id;
        if (!orderId) break;

        await supabaseAdmin
          .from("cm_orders")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", orderId);

        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`stripe-connect-webhook error handling ${event.type}:`, err);
    return new Response(JSON.stringify({ error: "Internal error processing event" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
