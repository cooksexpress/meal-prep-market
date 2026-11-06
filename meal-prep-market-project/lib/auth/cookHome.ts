// lib/auth/cookHome.ts
//
// Where a signed-in cook should land: the first unfinished sign-up
// step, or their dashboard once they're set up. Returns null if this
// person isn't a cook (e.g. a client), so callers can choose a fallback.

import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCookHome(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: cook } = await supabase
    .from("cm_cooks")
    .select("declaration_accepted")
    .eq("id", userId)
    .maybeSingle();

  if (!cook) return null;
  // Sign-up order: kitchen (tier) → profile → go live (declaration +
  // listing live in one tap). Unfinished cooks pick up at their profile,
  // which shows what they've already saved.
  if (!cook.declaration_accepted) return "/onboarding/profile";

  const { data: subscription } = await supabase
    .from("cm_subscriptions")
    .select("cook_id")
    .eq("cook_id", userId)
    .maybeSingle();

  if (!subscription) return "/onboarding/billing";
  return "/cook-dashboard";
}
