// app/inbox/[inquiryId]/page.tsx

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThreadDetail } from "@/components/inbox/ThreadDetail";
import { ReviewForm } from "@/components/inbox/ReviewForm";

interface InquiryPageProps {
  params: Promise<{ inquiryId: string }>;
}

export default async function InquiryDetailPage({ params }: InquiryPageProps) {
  const { inquiryId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // RLS (cm_inquiries_cook_select policy) already restricts this to
  // rows where auth.uid() = client_id, but we still filter explicitly
  // for a clean 404 instead of relying solely on RLS to return nothing.
  const { data: inquiry } = await supabase
    .from("cm_inquiries")
    .select("id, cook_id, client_id, message, created_at")
    .eq("id", inquiryId)
    .eq("client_id", user.id)
    .single();

  if (!inquiry) notFound();

  const { data: cook } = await supabase
    .from("cm_cooks")
    .select("id, business_name, tier, profile_photo_url, public_contact_email")
    .eq("id", inquiry.cook_id)
    .single();

  if (!cook) notFound();

  const { data: existingReview } = await supabase
    .from("cm_reviews")
    .select("id")
    .eq("cook_id", cook.id)
    .eq("client_id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/inbox" className="font-mono text-xs text-ocean underline">
        ← Back to inbox
      </Link>

      <div className="mt-6">
        <ThreadDetail
          cook={cook}
          cookEmail={cook.public_contact_email}
          message={inquiry.message}
          sentAt={inquiry.created_at}
        />
      </div>

      <div className="mt-10">
        {existingReview ? (
          <p className="font-mono text-sm text-ink/60">
            You&rsquo;ve already left a review for {cook.business_name}.
          </p>
        ) : (
          <ReviewForm cookId={cook.id} clientId={user.id} inquiryId={inquiry.id} />
        )}
      </div>
    </main>
  );
}
