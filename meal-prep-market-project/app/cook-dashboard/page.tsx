// app/cook-dashboard/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubscriptionStatusCard } from "@/components/cook-dashboard/SubscriptionStatusCard";
import { formatCookDisplayName } from "@/lib/utils/formatCookName";

export default async function CookDashboardOverviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/onboarding");

  const [{ data: cook }, { data: subscription }, { data: recentInquiries }] = await Promise.all([
    supabase.from("cm_cooks").select("first_name, business_name, is_active").eq("id", user.id).single(),
    supabase
      .from("cm_subscriptions")
      .select("status, trial_end_at, grace_period_ends_at")
      .eq("cook_id", user.id)
      .maybeSingle(),
    supabase
      .from("cm_inquiries")
      .select("id, client_name, message, created_at")
      .eq("cook_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (!cook) redirect("/onboarding/tier");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl">Welcome back{cook.first_name ? `, ${cook.first_name}` : ""}</h1>
        <p className="mt-1 text-ink/70">
          {cook.is_active ? "Your listing is live." : "Your listing isn't visible in search yet."}
        </p>
      </div>

      <SubscriptionStatusCard
        status={subscription?.status ?? null}
        trialEndAt={subscription?.trial_end_at ?? null}
        gracePeriodEndsAt={subscription?.grace_period_ends_at ?? null}
      />

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Recent inquiries</h2>
          <Link href="/cook-dashboard/inquiries" className="font-mono text-xs text-ocean underline">
            View all
          </Link>
        </div>

        {!recentInquiries || recentInquiries.length === 0 ? (
          <p className="mt-4 text-ink/70">No inquiries yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
            {recentInquiries.map((inquiry) => (
              <li key={inquiry.id} className="py-3">
                <p className="font-medium">{inquiry.client_name}</p>
                <p className="truncate text-sm text-ink/70">{inquiry.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
