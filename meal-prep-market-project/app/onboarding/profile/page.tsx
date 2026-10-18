// app/onboarding/profile/page.tsx

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/onboarding/ProfileForm";
import { MediaUploader } from "@/components/onboarding/MediaUploader";
import { MenuEditor } from "@/components/menu/MenuEditor";

export default async function OnboardingProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/onboarding");

  const { data: cook } = await supabase
    .from("cm_cooks")
    .select(
      "bio, cuisine_tags, dietary_specialty_tags, price_range_min, price_range_max, public_contact_email, public_contact_phone, min_order_meals"
    )
    .eq("id", user.id)
    .single();

  // If they haven't completed step 1 yet, send them back.
  if (!cook) redirect("/onboarding/tier");

  const [{ data: media }, { data: packages }] = await Promise.all([
    supabase.from("cm_cook_media").select("*").eq("cook_id", user.id).order("sort_order"),
    supabase.from("cm_packages").select("*").eq("cook_id", user.id).order("sort_order"),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-wide text-ink/50">Step 3 of 4</p>
      <h1 className="mt-2 font-display text-3xl">Build your profile</h1>
      <p className="mt-3 text-ink/70">
        This is what clients see when they find you. Add a photo or two about you, then your
        menu: the dishes and packs clients can order, each with its own photo if you like.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-xl">About you (optional)</h2>
        <p className="mt-1 text-sm text-ink/60">
          Your logo, a photo of you, or your kitchen. The first photo shows on your listing card.
          Add dish photos to each item in your menu.
        </p>
        <div className="mt-3">
          <MediaUploader cookId={user.id} initialMedia={media ?? []} />
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

      <section className="mt-10 border-t border-hairline pt-10">
        <ProfileForm cookId={user.id} initial={cook} redirectTo="/onboarding/billing" submitLabel="Continue to billing" />
      </section>
    </main>
  );
}
