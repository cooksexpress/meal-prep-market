// app/cooks/[cookId]/page.tsx
//
// Public cook profile — server-rendered for SEO (a local directory's
// individual listing pages are a real acquisition surface). Anonymous
// visitors can view everything and submit an inquiry without an
// account.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProfileHeader } from "@/components/cook-profile/ProfileHeader";
import { PhotoGallery } from "@/components/cook-profile/PhotoGallery";
import { PackageList } from "@/components/cook-profile/PackageList";
import { OrderCheckout } from "@/components/cook-profile/OrderCheckout";
import { ReviewList } from "@/components/cook-profile/ReviewList";
import { InquiryForm } from "@/components/cook-profile/InquiryForm";
import { formatCookDisplayName } from "@/lib/utils/formatCookName";
import type { Cook, CookMedia, Package, Review } from "@/lib/types/database";

interface CookProfilePageProps {
  params: Promise<{ cookId: string }>;
}

async function getCookProfileData(cookId: string) {
  const supabase = await createClient();

  const { data: cookRaw } = await supabase
    .from("cm_cooks")
    .select("*")
    .eq("id", cookId)
    .eq("is_active", true)
    .single();

  if (!cookRaw) return null;
  const cook = cookRaw as Cook;

  const [{ data: mediaRaw }, { data: packagesRaw }, { data: reviewsRaw }, { data: vendorAccountRaw }] =
    await Promise.all([
      supabase
        .from("cm_cook_media")
        .select("*")
        .eq("cook_id", cookId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("cm_packages")
        .select("*")
        .eq("cook_id", cookId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("cm_reviews")
        .select("*")
        .eq("cook_id", cookId)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("cm_vendor_stripe_accounts")
        .select("charges_enabled")
        .eq("cook_id", cookId)
        .maybeSingle(),
    ]);

  // Cast each result to its real, full row type here — once, in one
  // place — rather than leaving every downstream usage to re-derive
  // (and potentially narrow) the type itself.
  const media = (mediaRaw ?? []) as CookMedia[];
  const packages = (packagesRaw ?? []) as Package[];
  const reviews = (reviewsRaw ?? []) as Review[];
  const canAcceptPayment = (vendorAccountRaw as { charges_enabled: boolean } | null)?.charges_enabled ?? false;

  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0;

  return {
    cook,
    media,
    packages,
    reviews,
    canAcceptPayment,
    averageRating,
    reviewCount,
  };
}

export async function generateMetadata({ params }: CookProfilePageProps): Promise<Metadata> {
  const { cookId } = await params;
  const data = await getCookProfileData(cookId);

  if (!data) return { title: "Cook not found" };

  const displayName = formatCookDisplayName(data.cook);
  return {
    title: `${displayName} — Gold Coast meal prep`,
    description: data.cook.bio ?? `Custom weekly meal prep from ${displayName}, Gold Coast.`,
  };
}

export default async function CookProfilePage({ params }: CookProfilePageProps) {
  const { cookId } = await params;
  const data = await getCookProfileData(cookId);

  if (!data) notFound();

  const { cook, media, packages, reviews, canAcceptPayment, averageRating, reviewCount } = data;
  const availableItems = packages.filter((p) => p.is_available);
  const canOrderOnline = canAcceptPayment && availableItems.length > 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <ProfileHeader cook={cook} averageRating={averageRating} reviewCount={reviewCount} />
      <PhotoGallery media={media} />
      {canOrderOnline ? (
        <div className="py-8">
          <OrderCheckout
            cookId={cook.id}
            businessName={cook.business_name}
            items={availableItems}
            minOrderMeals={cook.min_order_meals}
          />
        </div>
      ) : (
        <PackageList packages={packages} minOrderMeals={cook.min_order_meals} />
      )}
      <ReviewList reviews={reviews} />
      <div className="pt-4">
        <InquiryForm cookId={cook.id} />
      </div>
    </main>
  );
}
