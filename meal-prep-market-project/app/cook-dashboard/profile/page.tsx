// app/cook-dashboard/profile/page.tsx
//
// Reuses the exact same ProfileForm and ProfilePhotoUploader
// components built for onboarding (the menu lives on its own Menu page) — post-signup editing is the same
// operation as initial setup, just pre-filled and without the wizard
// framing.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BusinessNameEditor } from "@/components/cook-dashboard/BusinessNameEditor";
import { ProfileForm } from "@/components/onboarding/ProfileForm";
import { ProfilePhotoUploader } from "@/components/onboarding/ProfilePhotoUploader";
import Link from "next/link";
import { OpeningHoursEditor } from "@/components/cook-dashboard/OpeningHoursEditor";
import { DeliveryEditor } from "@/components/cook-dashboard/DeliveryEditor";

export default async function CookDashboardProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/onboarding");

  const { data: cook } = await supabase
    .from("cm_cooks")
    .select(
      "first_name, last_name, business_name, tier, bio, cuisine_tags, dietary_specialty_tags, public_contact_email, public_contact_phone, profile_photo_url, opening_hours, delivery_method, delivery_areas, delivery_days, delivery_fee, pickup_area, order_cutoff_day, order_cutoff_time"
    )
    .eq("id", user.id)
    .single();

  if (!cook) redirect("/onboarding/tier");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl">Edit your profile</h1>
        <p className="mt-1 text-ink/70">This is what clients see when they find your listing.</p>
      </div>

      <BusinessNameEditor
        cookId={user.id}
        initialFirstName={cook.first_name}
        initialLastName={cook.last_name}
        initialBusinessName={cook.business_name}
        tier={cook.tier}
      />

      <section id="photo">
        <h2 className="font-display text-xl">Your main photo</h2>
        <p className="mt-1 text-sm text-ink/60">
          A photo of you or your logo, whichever you prefer. It shows at the top of your listing
          and on your card on the homepage. You can add a photo to each dish in your menu.
        </p>
        <div className="mt-4">
          <ProfilePhotoUploader cookId={user.id} initialUrl={cook.profile_photo_url} />
        </div>
      </section>

      <section id="delivery">
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

      <section id="hours">
        <h2 className="font-display text-xl">Opening days and hours (optional)</h2>
        <p className="mt-1 text-sm text-ink/60">
          Tick the days you work and set your hours. They show on your listing so clients know
          when to expect a reply.
        </p>
        <div className="mt-4">
          <OpeningHoursEditor cookId={user.id} initialHours={cook.opening_hours} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl">Your menu</h2>
        <p className="mt-1 text-sm text-ink/60">
          Your dishes, packs, and minimum order are managed on the Menu page.
        </p>
        <Link
          href="/cook-dashboard/menu"
          className="mt-3 inline-block rounded-full border border-gold px-5 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-paper"
        >
          Edit your menu
        </Link>
      </section>

      <section id="about" className="border-t border-hairline pt-10">
        <ProfileForm cookId={user.id} initial={cook} submitLabel="Save changes" />
      </section>
    </div>
  );
}
