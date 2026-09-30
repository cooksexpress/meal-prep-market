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
      .select("id, is_active")
      .eq("id", cook_id)
      .single();

    if (cookError || !cook || !cook.is_active) {
      return new Response(JSON.stringify({ error: "Cook not found or inactive" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 2. Look up an existing client by email.
    const { data: existingClient, error: lookupError } = await supabaseAdmin
      .from("cm_clients")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (lookupError) throw lookupError;

    let clientId: string;

    if (existingClient) {
      // 3b. Repeat guest — reuse the existing account.
      clientId = existingClient.id;
    } else {
      // 3a. First-time guest — create the auth user, then the client row.
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: { full_name: name },
      });

      if (createError || !created?.user) {
        throw createError ?? new Error("Failed to create auth user");
      }

      clientId = created.user.id;

      const { error: insertClientError } = await supabaseAdmin.from("cm_clients").insert({
        id: clientId,
        full_name: name,
        email: normalizedEmail,
        phone: phone ?? null,
      });

      if (insertClientError) throw insertClientError;
    }

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

    // 5. Fire the magic link so the client can log in passwordlessly.
    const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: `${SITE_URL}/inbox` },
    });

    if (otpError) {
      // Non-fatal: the inquiry is already saved and the cook will still
      // be notified. Log for visibility but don't fail the request.
      console.error("Magic link send failed:", otpError.message);
    } else {
      await supabaseAdmin
        .from("cm_inquiries")
        .update({ magic_link_sent_at: new Date().toISOString() })
        .eq("id", inquiry.id);
    }

    // 6. Notify the cook (separate concern — see notify-cook function).
    //    Fire-and-forget here; failures shouldn't block the client's response.
    supabaseAdmin.functions
      .invoke("notify-cook", { body: { inquiry_id: inquiry.id } })
      .catch((err) => console.error("Cook notification invoke failed:", err));

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
