// app/cook-dashboard/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetupChecklist } from "@/components/cook-dashboard/SetupChecklist";
import { ShareListing } from "@/components/cook-dashboard/ShareListing";
import { PauseOrdersCard } from "@/components/cook-dashboard/PauseOrdersCard";
import { SubscriptionStatusCard } from "@/components/cook-dashboard/SubscriptionStatusCard";
import { formatCookDisplayName } from "@/lib/utils/formatCookName";

export default async function CookDashboardOverviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/onboarding");

  const [
    { data: cook },
    { data: subscription },
    { data: recentInquiries },
    { count: menuCount },
    { data: bankAccount },
  ] = await Promise.all([
    supabase
      .from("cm_cooks")
      .select(
        "first_name, business_name, is_active, orders_paused, paused_until, profile_photo_url, bio, opening_hours, tier, delivery_method, delivery_areas, pickup_area"
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("cm_subscriptions")
      .select("status, trial_end_at, grace_period_ends_at, stripe_subscription_id")
      .eq("cook_id", user.id)
      .maybeSingle(),
    supabase
      .from("cm_inquiries")
      .select("id, client_name, message, created_at")
      .eq("cook_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("cm_packages").select("id", { count: "exact", head: true }).eq("cook_id", user.id),
    supabase.from("cm_vendor_stripe_accounts").select("charges_enabled").eq("cook_id", user.id).maybeSingle(),
  ]);

  if (!cook) redirect("/onboarding/tier");

  const checklist = [
    {
      label: "Main photo",
      done: Boolean(cook.profile_photo_url),
      href: "/cook-dashboard/profile#photo",
      hint: "A photo of you or your logo.",
    },
    {
      label: "Menu",
      done: (menuCount ?? 0) > 0,
      href: "/cook-dashboard/menu",
      hint: "Add at least one dish or pack.",
    },
    {
      label: "About you",
      done: Boolean(cook.bio && cook.bio.trim()),
      href: "/cook-dashboard/profile#about",
      hint: "A few lines about you and your cooking.",
    },
    {
      label: cook.tier === "tier_1_in_home" ? "Areas you cover" : "Delivery or pickup",
      done:
        cook.tier === "tier_1_in_home"
          ? Boolean(cook.delivery_areas)
          : Boolean(cook.delivery_method && (cook.delivery_areas || cook.pickup_area)),
      href: "/cook-dashboard/profile#delivery",
      hint: "Where and when clients get their meals.",
    },
    {
      label: "Opening hours",
      done: Boolean(cook.opening_hours && Object.keys(cook.opening_hours).length > 0),
      href: "/cook-dashboard/profile#hours",
      hint: "The days and hours you work.",
    },
    {
      label: "Bank details",
      done: Boolean((bankAccount as { charges_enabled: boolean } | null)?.charges_enabled),
      href: "/cook-dashboard/bank-setup",
      hint: "So clients can pay you online.",
    },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl">Welcome back{cook.first_name ? `, ${cook.first_name}` : ""}</h1>
        <p className="mt-1 text-ink/70">
          {cook.is_active ? "Your listing is live." : "Your listing isn't visible in search yet."}
        </p>
      </div>

      <SetupChecklist items={checklist} />

      <PauseOrdersCard
        cookId={user.id}
        initialPaused={cook.orders_paused}
        initialPausedUntil={cook.paused_until}
      />

      <SubscriptionStatusCard
        status={subscription?.status ?? null}
        trialEndAt={subscription?.trial_end_at ?? null}
        gracePeriodEndsAt={subscription?.grace_period_ends_at ?? null}
        hasSubscription={Boolean(subscription?.stripe_subscription_id)}
        showSubscribeLink
      />

      <ShareListing cookId={user.id} businessName={cook.business_name} />

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
