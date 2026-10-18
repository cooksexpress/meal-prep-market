// app/cook-dashboard/profile/page.tsx
//
// Reuses the exact same ProfileForm and MediaUploader
// components built for onboarding (the menu lives on its own Menu page) — post-signup editing is the same
// operation as initial setup, just pre-filled and without the wizard
// framing.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BusinessNameEditor } from "@/components/cook-dashboard/BusinessNameEditor";
import { ProfileForm } from "@/components/onboarding/ProfileForm";
import { MediaUploader } from "@/components/onboarding/MediaUploader";
import Link from "next/link";

export default async function CookDashboardProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/onboarding");

  const { data: cook } = await supabase
    .from("cm_cooks")
    .select(
      "first_name, last_name, business_name, tier, bio, cuisine_tags, dietary_specialty_tags, price_range_min, price_range_max, public_contact_email, public_contact_phone"
    )
    .eq("id", user.id)
    .single();

  if (!cook) redirect("/onboarding/tier");

  const { data: media } = await supabase
    .from("cm_cook_media")
    .select("*")
    .eq("cook_id", user.id)
    .order("sort_order");

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

      <section>
        <h2 className="font-display text-xl">Your photos</h2>
        <p className="mt-1 text-sm text-ink/60">
          Add 3–6 photos of your best dishes. They show at the top of your profile.
        </p>
        <div className="mt-3">
          <MediaUploader cookId={user.id} initialMedia={media ?? []} />
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

      <section className="border-t border-hairline pt-10">
        <ProfileForm cookId={user.id} initial={cook} submitLabel="Save changes" />
      </section>
    </div>
  );
}
