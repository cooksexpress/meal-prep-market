// supabase/functions/submit-inquiry/index.ts
//
// POST /functions/v1/submit-inquiry
// Called from the frontend using the PUBLIC ANON KEY only.
// The Service Role Key lives exclusively in this function's environment
// variables (set via `supabase secrets set`), never shipped to the client.
//
// Request body:
// {
//   "cook_id": "uuid",
//   "name": "string",
//   "email": "string",
//   "phone": "string",
//   "message": "string"
// }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://mealprepmarket.com.au";

// Admin client — service role, bypasses RLS. Function-scoped only.
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // tighten to your real domain before launch
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InquiryPayload {
  cook_id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
}

function isValidPayload(body: unknown): body is InquiryPayload {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.cook_id === "string" &&
    typeof b.name === "string" && b.name.trim().length > 0 &&
    typeof b.email === "string" && /\S+@\S+\.\S+/.test(b.email) &&
    typeof b.message === "string" && b.message.trim().length > 0 &&
    (b.phone === undefined || typeof b.phone === "string")
  );
}

// Finds the customer record for this email, or quietly creates one.
// No emails are sent to the customer. If the email already belongs to
// an account (for example a cook), that account is reused.
async function findOrCreateClient(email: string, name: string, phone: string | null): Promise<string> {
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("cm_clients")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return existing.id;

  let userId: string | null = null;
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (created?.user) {
    userId = created.user.id;
  } else {
    const { data: foundId, error: rpcError } = await supabaseAdmin.rpc("cm_auth_user_id_by_email", {
      p_email: email,
    });
    if (rpcError || !foundId) throw createError ?? rpcError ?? new Error("Could not find or create customer");
    userId = foundId as string;
  }

  const { error: upsertError } = await supabaseAdmin
    .from("cm_clients")
    .upsert({ id: userId, full_name: name, email, phone }, { onConflict: "id", ignoreDuplicates: true });
  if (upsertError) throw upsertError;
  return userId;
}

// Paused orders (migration 008). Reopens on the "back" date, Gold Coast time.
function isPausedNow(cook: { orders_paused?: boolean | null; paused_until?: string | null } | null): boolean {
  if (!cook?.orders_paused) return false;
  if (!cook.paused_until) return true;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Brisbane" }).format(new Date());
  return cook.paused_until > today;
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
    return new Response(JSON.stringify({ error: "Missing or invalid fields" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { cook_id, name, email, phone, message } = body;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    // 1. Confirm the cook exists and is active — don't let inquiries pile
    //    up against a delisted/nonexistent cook.
    const { data: cook, error: cookError } = await supabaseAdmin
      .from("cm_cooks")
      .select("id, is_active, orders_paused, paused_until")
      .eq("id", cook_id)
      .single();

    if (cookError || !cook || !cook.is_active) {
      return new Response(JSON.stringify({ error: "Cook not found or inactive" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (isPausedNow(cook)) {
      return new Response(
        JSON.stringify({ error: "This cook isn't taking orders right now. Please check back soon." }),
        { status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // 2. Customer record (quiet, no email to the customer).
    const clientId = await findOrCreateClient(normalizedEmail, name, phone ?? null);

    // 4. Log the inquiry (client_id always populated).
    const { data: inquiry, error: inquiryError } = await supabaseAdmin
      .from("cm_inquiries")
      .insert({
        cook_id,
        client_id: clientId,
        client_name: name,
        client_email: normalizedEmail,
        client_phone: phone ?? null,
        message,
      })
      .select("id")
      .single();

    if (inquiryError) throw inquiryError;

    // 5. Notify the cook (separate concern — see notify-cook function).
    //    Fire-and-forget here; failures shouldn't block the client's response.
    try {
      const { error: notifyError } = await supabaseAdmin.functions.invoke("notify-cook", {
        body: { inquiry_id: inquiry.id },
      });
      if (notifyError) console.error("Cook notification failed:", notifyError);
    } catch (err) {
      console.error("Cook notification invoke failed:", err);
    }

    return new Response(JSON.stringify({ success: true, inquiry_id: inquiry.id }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-inquiry error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
