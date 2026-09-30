// app/admin/page.tsx

import { createClient } from "@/lib/supabase/server";
import { CookBillingTable } from "@/components/admin/CookBillingTable";

export default async function AdminBillingOverviewPage() {
  const supabase = await createClient();

  const { data: cooks } = await supabase
    .from("cm_cooks")
    .select("id, business_name, is_active")
    .order("business_name");

  const { data: subscriptions } = await supabase
    .from("cm_subscriptions")
    .select("cook_id, status, trial_end_at, grace_period_ends_at");

  const subByCookId = new Map((subscriptions ?? []).map((s) => [s.cook_id, s]));

  const rows = (cooks ?? []).map((cook) => {
    const sub = subByCookId.get(cook.id);
    return {
      id: cook.id,
      business_name: cook.business_name,
      is_active: cook.is_active,
      status: sub?.status ?? null,
      trial_end_at: sub?.trial_end_at ?? null,
      grace_period_ends_at: sub?.grace_period_ends_at ?? null,
    };
  });

  return (
    <div>
      <h1 className="font-display text-3xl">Billing overview</h1>
      <p className="mt-1 text-ink/70">Every cook and their current subscription status.</p>
      <div className="mt-8">
        <CookBillingTable rows={rows} />
      </div>
    </div>
  );
}
