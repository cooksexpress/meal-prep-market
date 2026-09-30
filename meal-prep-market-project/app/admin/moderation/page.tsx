// app/admin/moderation/page.tsx

import { createClient } from "@/lib/supabase/server";
import { CookModerationList } from "@/components/admin/CookModerationList";
import { ReviewModerationList } from "@/components/admin/ReviewModerationList";

export default async function AdminModerationPage() {
  const supabase = await createClient();

  const [{ data: cooks }, { data: reviews }] = await Promise.all([
    supabase.from("cm_cooks").select("id, business_name, is_active").order("business_name"),
    supabase
      .from("cm_reviews")
      .select("id, cook_id, rating, review_text, is_hidden, hidden_reason, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const cookNameById = new Map((cooks ?? []).map((c) => [c.id, c.business_name]));

  const reviewRows = (reviews ?? []).map((r) => ({
    id: r.id,
    cook_business_name: cookNameById.get(r.cook_id) ?? "Unknown cook",
    rating: r.rating,
    review_text: r.review_text,
    is_hidden: r.is_hidden,
    hidden_reason: r.hidden_reason,
    created_at: r.created_at,
  }));

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-display text-3xl">Moderation</h1>
        <p className="mt-1 text-ink/70">
          There&rsquo;s no in-app reporting yet — this is a direct browse-and-act view over every
          listing and review. Add a report button later if volume calls for it.
        </p>
      </div>

      <section>
        <h2 className="font-display text-xl">Listings</h2>
        <div className="mt-4">
          <CookModerationList cooks={cooks ?? []} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl">Reviews</h2>
        <div className="mt-4">
          <ReviewModerationList reviews={reviewRows} />
        </div>
      </section>
    </div>
  );
}
