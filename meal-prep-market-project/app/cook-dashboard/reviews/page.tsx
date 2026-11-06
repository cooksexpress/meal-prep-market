// app/cook-dashboard/reviews/page.tsx
//
// A cook's reviews: reply to each one (shown publicly under the review)
// and share it as a picture on Instagram, Facebook or WhatsApp.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CookReviews } from "@/components/cook-dashboard/CookReviews";
import type { Review } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function CookReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: cook }, { data: reviews }] = await Promise.all([
    supabase.from("cm_cooks").select("business_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("cm_reviews")
      .select("*")
      .eq("cook_id", user.id)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Reviews</h1>
        <p className="mt-1 text-ink/70">
          Say thanks with a reply (it shows under the review on your page), and share your best
          reviews on Instagram, Facebook or WhatsApp.
        </p>
      </div>
      <CookReviews
        cookId={user.id}
        businessName={(cook as { business_name: string } | null)?.business_name ?? "My kitchen"}
        initialReviews={(reviews ?? []) as Review[]}
      />
    </div>
  );
}
