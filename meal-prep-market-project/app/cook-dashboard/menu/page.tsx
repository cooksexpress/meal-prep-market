// app/cook-dashboard/menu/page.tsx

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MenuManager } from "@/components/cook-dashboard/MenuManager";

export default async function CookDashboardMenuPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/onboarding");

  const { data: items } = await supabase
    .from("cm_packages")
    .select("*")
    .eq("cook_id", user.id)
    .order("sort_order");

  return (
    <div>
      <h1 className="font-display text-3xl">Menu</h1>
      <p className="mt-1 text-ink/70">What customers can order and pay for directly.</p>
      <div className="mt-8">
        <MenuManager cookId={user.id} initialItems={items ?? []} />
      </div>
    </div>
  );
}
