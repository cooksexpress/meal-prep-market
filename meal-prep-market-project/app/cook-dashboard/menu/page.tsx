// app/cook-dashboard/menu/page.tsx

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MenuEditor } from "@/components/menu/MenuEditor";

export default async function CookDashboardMenuPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/onboarding");

  const [{ data: items }, { data: cook }] = await Promise.all([
    supabase.from("cm_packages").select("*").eq("cook_id", user.id).order("sort_order"),
    supabase.from("cm_cooks").select("min_order_meals").eq("id", user.id).single(),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl">Menu</h1>
      <p className="mt-1 text-ink/70">
        What clients can order. Tap <span className="text-ink">Edit</span> to change a dish, or
        set it to <span className="text-ink">Sold out</span> when you can&rsquo;t make it this week.
      </p>
      <div className="mt-8">
        <MenuEditor
          cookId={user.id}
          initialItems={items ?? []}
          initialMinOrderMeals={cook?.min_order_meals ?? null}
          showAvailability
        />
      </div>
    </div>
  );
}
