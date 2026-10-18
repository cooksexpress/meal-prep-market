// supabase/functions/trial-reminders/index.ts
//
// POST /functions/v1/trial-reminders
// Run once a day by a pg_cron schedule (see 007_schedule_trial_reminders.sql).
// Emails cooks on a free trial (no card yet):
//   - 7 days before the trial ends
//   - 1 day before the trial ends
// Each email is sent once (trial_reminder_*_sent_at). Cooks who already
// subscribed through Stripe are skipped.
//
// Only callable with the service role key, so the public can't trigger
// emails.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("NOTIFICATIONS_FROM_EMAIL") ?? "notifications@mealprepmarket.com.au";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://mealprepmarket.com.au";

const DAY_MS = 24 * 60 * 60 * 1000;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: `Meal Prep Market <${FROM_EMAIL}>`, to, subject, html }),
  });

  if (!res.ok) {
    throw new Error(`Resend API error (${res.status}): ${await res.text()}`);
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Brisbane",
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function reminderEmail(name: string, endDate: string, finalNotice: boolean): { subject: string; html: string } {
  const subject = finalNotice
    ? "Your free Meal Prep Market listing ends tomorrow"
    : "Your free Meal Prep Market listing ends in 7 days";

  const intro = finalNotice
    ? `Your 90-day free trial ends <strong>tomorrow (${endDate})</strong>.`
    : `Your 90-day free trial ends on <strong>${endDate}</strong>, one week from today.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #1b1a17;">
      <p>Hi ${escapeHtml(name)},</p>
      <p>${intro}</p>
      <p>To keep your listing live so clients can keep finding and ordering from you, subscribe from your dashboard. It only takes a minute.</p>
      <p style="margin: 28px 0;">
        <a href="${SITE_URL}/cook-dashboard/billing"
           style="background: #D4AF63; color: #0E0D0B; padding: 12px 22px; border-radius: 999px; text-decoration: none; font-weight: bold;">
          Subscribe and stay listed
        </a>
      </p>
      <p>If you don't subscribe, your listing will be hidden when the trial ends. We'll keep your menu and photos saved, so you can come back any time.</p>
      <p>Thanks for cooking with us,<br/>The Meal Prep Market team</p>
    </div>`;

  return { subject, html };
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = Date.now();
  const inEightDays = new Date(now + 8 * DAY_MS).toISOString();

  const { data: trials, error } = await supabaseAdmin
    .from("cm_subscriptions")
    .select("cook_id, trial_end_at, trial_reminder_7d_sent_at, trial_reminder_1d_sent_at")
    .eq("status", "trialing")
    .is("stripe_subscription_id", null)
    .gt("trial_end_at", new Date(now).toISOString())
    .lte("trial_end_at", inEightDays);

  if (error) {
    console.error("trial-reminders query failed:", error);
    return new Response(JSON.stringify({ error: "query failed" }), { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const trial of trials ?? []) {
    const msLeft = new Date(trial.trial_end_at).getTime() - now;
    const finalNotice = msLeft <= 1.5 * DAY_MS;
    const weekNotice = !finalNotice && msLeft <= 7.5 * DAY_MS;

    if (finalNotice && trial.trial_reminder_1d_sent_at) continue;
    if (weekNotice && trial.trial_reminder_7d_sent_at) continue;
    if (!finalNotice && !weekNotice) continue;

    try {
      const [{ data: userData, error: userError }, { data: cook }] = await Promise.all([
        supabaseAdmin.auth.admin.getUserById(trial.cook_id),
        supabaseAdmin
          .from("cm_cooks")
          .select("first_name, business_name")
          .eq("id", trial.cook_id)
          .maybeSingle(),
      ]);

      const email = userData?.user?.email;
      if (userError || !email) throw userError ?? new Error("No email for cook");

      const name = cook?.first_name || cook?.business_name || "there";
      const { subject, html } = reminderEmail(name, formatDate(trial.trial_end_at), finalNotice);
      await sendEmail(email, subject, html);

      const stamp = new Date().toISOString();
      const update = finalNotice
        ? { trial_reminder_1d_sent_at: stamp, trial_reminder_7d_sent_at: trial.trial_reminder_7d_sent_at ?? stamp }
        : { trial_reminder_7d_sent_at: stamp };

      await supabaseAdmin.from("cm_subscriptions").update(update).eq("cook_id", trial.cook_id);
      sent += 1;
    } catch (err) {
      console.error(`trial-reminders: failed for cook ${trial.cook_id}:`, err);
      failed += 1;
    }
  }

  return new Response(JSON.stringify({ checked: trials?.length ?? 0, sent, failed }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
