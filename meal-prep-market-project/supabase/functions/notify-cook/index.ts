// supabase/functions/notify-cook/index.ts
//
// POST /functions/v1/notify-cook
// Internal function — invoked by submit-inquiry (service-to-service),
// not called directly from the frontend. Looks up the inquiry + cook,
// sends a plain email notification, and stamps the inquiry as notified.
//
// Uses Resend for email delivery. Swap the RESEND_* block for
// SendGrid/Postmark/etc. if you prefer a different provider — the rest
// of the function is provider-agnostic.
//
// Request body:
// { "inquiry_id": "uuid" }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("NOTIFICATIONS_FROM_EMAIL") ?? "notifications@mealprepmarket.com.au";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://mealprepmarket.com.au";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyPayload {
  inquiry_id: string;
}

function isValidPayload(body: unknown): body is NotifyPayload {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.inquiry_id === "string" && b.inquiry_id.length > 0;
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API error (${res.status}): ${errText}`);
  }
}

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
    return new Response(JSON.stringify({ error: "Missing inquiry_id" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { inquiry_id } = body;

  try {
    // 1. Fetch the inquiry, joined with the cook's account email via
    //    auth.users (cm_cooks.id IS the auth.users.id).
    const { data: inquiry, error: inquiryError } = await supabaseAdmin
      .from("cm_inquiries")
      .select(
        "id, cook_id, client_name, client_email, client_phone, message, email_notification_sent_at"
      )
      .eq("id", inquiry_id)
      .single();

    if (inquiryError || !inquiry) {
      return new Response(JSON.stringify({ error: "Inquiry not found" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Idempotency guard — don't double-send if this gets retried.
    if (inquiry.email_notification_sent_at) {
      return new Response(JSON.stringify({ success: true, skipped: "already_sent" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { data: cook, error: cookError } = await supabaseAdmin
      .from("cm_cooks")
      .select("id, business_name")
      .eq("id", inquiry.cook_id)
      .single();

    if (cookError || !cook) {
      throw cookError ?? new Error("Cook not found for inquiry");
    }

    // Cook's login email comes from auth.users, not cm_cooks.
    const { data: cookAuthUser, error: authLookupError } =
      await supabaseAdmin.auth.admin.getUserById(cook.id);

    if (authLookupError || !cookAuthUser?.user?.email) {
      throw authLookupError ?? new Error("Could not resolve cook's email");
    }

    const cookEmail = cookAuthUser.user.email;

    // 2. Send the notification.
    const subject = `New inquiry from ${inquiry.client_name} — Meal Prep Market`;
    const html = `
      <p>Hi ${cook.business_name},</p>
      <p>You've received a new inquiry through Meal Prep Market:</p>
      <table cellpadding="4">
        <tr><td><strong>Name:</strong></td><td>${inquiry.client_name}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${inquiry.client_email}</td></tr>
        <tr><td><strong>Phone:</strong></td><td>${inquiry.client_phone ?? "Not provided"}</td></tr>
      </table>
      <p><strong>Message:</strong></p>
      <p>${inquiry.message}</p>
      <p>
        Reply directly to this client at ${inquiry.client_email}, or view the
        inquiry in your <a href="${SITE_URL}/dashboard/inquiries">Meal Prep Market dashboard</a>.
      </p>
      <p style="color:#888;font-size:12px;">
        Meal Prep Market is an advertising directory only. All booking
        arrangements and payment are handled directly between you and the client.
      </p>
    `;

    await sendEmail(cookEmail, subject, html);

    // 3. Stamp the inquiry as notified.
    const { error: updateError } = await supabaseAdmin
      .from("cm_inquiries")
      .update({ email_notification_sent_at: new Date().toISOString() })
      .eq("id", inquiry_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-cook error:", err);
    return new Response(JSON.stringify({ error: "Failed to send cook notification" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
