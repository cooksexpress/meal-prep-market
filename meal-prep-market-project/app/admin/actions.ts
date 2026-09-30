// app/admin/actions.ts
//
// Server Actions running under the calling admin's own session (via
// the cookie-based server client), NOT the service role. This means
// RLS's cm_is_admin() check is what actually authorizes these writes —
// if someone's cm_admins row is ever removed, these actions stop
// working immediately without any code change needed here.

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deactivateCook(cookId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cm_cooks").update({ is_active: false }).eq("id", cookId);

  if (error) throw new Error("Failed to deactivate listing");
  revalidatePath("/admin");
}

export async function reactivateCook(cookId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cm_cooks").update({ is_active: true }).eq("id", cookId);

  if (error) throw new Error("Failed to reactivate listing");
  revalidatePath("/admin");
}

export async function hideReview(reviewId: string, reason: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cm_reviews")
    .update({ is_hidden: true, hidden_reason: reason || "Removed by admin" })
    .eq("id", reviewId);

  if (error) throw new Error("Failed to hide review");
  revalidatePath("/admin/moderation");
}

export async function unhideReview(reviewId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cm_reviews")
    .update({ is_hidden: false, hidden_reason: null })
    .eq("id", reviewId);

  if (error) throw new Error("Failed to restore review");
  revalidatePath("/admin/moderation");
}
