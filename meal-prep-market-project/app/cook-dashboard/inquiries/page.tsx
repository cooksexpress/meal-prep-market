// app/cook-dashboard/inquiries/page.tsx

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InquiryTable } from "@/components/cook-dashboard/InquiryTable";

export default async function CookDashboardInquiriesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/onboarding");

  const { data: inquiries } = await supabase
    .from("cm_inquiries")
    .select("id, client_name, client_email, client_phone, message, created_at")
    .eq("cook_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-display text-3xl">Inquiries</h1>
      <p className="mt-1 text-ink/70">Everyone who&rsquo;s reached out through your listing.</p>
      <div className="mt-8">
        <InquiryTable inquiries={inquiries ?? []} />
      </div>
    </div>
  );
}
