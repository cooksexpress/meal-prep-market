// app/onboarding/profile/page.tsx

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/onboarding/ProfileForm";
import { ProfilePhotoUploader } from "@/components/onboarding/ProfilePhotoUploader";
import { MenuEditor } from "@/components/menu/MenuEditor";
import { OpeningHoursEditor } from "@/components/cook-dashboard/OpeningHoursEditor";
import { DeliveryEditor } from "@/components/cook-dashboard/DeliveryEditor";

export default async function OnboardingProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/onboarding");

  const { data: cook } = await supabase
    .from("cm_cooks")
    .select(
      "bio, cuisine_tags, dietary_specialty_tags, public_contact_email, public_contact_phone, min_order_meals, profile_photo_url, opening_hours, tier, delivery_method, delivery_areas, delivery_days, delivery_fee, pickup_area, order_cutoff_day, order_cutoff_time"
    )
    .eq("id", user.id)
    .single();

  // If they haven't completed step 1 yet, send them back.
  if (!cook) redirect("/onboarding/tier");

  const { data: packages } = await supabase
    .from("cm_packages")
    .select("*")
    .eq("cook_id", user.id)
    .order("sort_order");

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-wide text-ink/50">Step 3 of 4</p>
      <h1 className="mt-2 font-display text-3xl">Build your profile</h1>
      <p className="mt-3 text-ink/70">
        This is what clients see when they find you. Add your main photo, then your menu: the
        dishes and packs clients can order, each with its own photo if you like.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-xl">Your main photo</h2>
        <p className="mt-1 text-sm text-ink/60">
          A photo of you or your logo, whichever you prefer. It shows at the top of your listing
          and on your card on the homepage. You can add a photo to each dish in your menu.
        </p>
        <div className="mt-4">
          <ProfilePhotoUploader cookId={user.id} initialUrl={cook.profile_photo_url} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl">Your menu</h2>
        <div className="mt-3">
          <MenuEditor
            cookId={user.id}
            initialItems={packages ?? []}
            initialMinOrderMeals={cook.min_order_meals}
          />
        </div>
      </section>

      <section className="mt-10" id="delivery">
        <h2 className="font-display text-xl">
          {cook.tier === "tier_1_in_home" ? "Areas and booking" : "Delivery and pickup"}
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          Clients see this on your listing, so they know straight away if you can feed them.
        </p>
        <div className="mt-4">
          <DeliveryEditor cookId={user.id} initial={cook} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl">Opening days and hours (optional)</h2>
        <p className="mt-1 text-sm text-ink/60">
          Tick the days you work and set your hours. They show on your listing so clients know
          when to expect a reply.
        </p>
        <div className="mt-4">
          <OpeningHoursEditor cookId={user.id} initialHours={cook.opening_hours} />
        </div>
      </section>

      <section className="mt-10 border-t border-hairline pt-10">
        <ProfileForm cookId={user.id} initial={cook} redirectTo="/onboarding/billing" submitLabel="Continue" />
      </section>
    </main>
  );
}
