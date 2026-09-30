// app/inbox/page.tsx
//
// Gated by middleware (requires a session). Lists every inquiry the
// logged-in client has sent, newest first. RLS on cm_inquiries
// (auth.uid() = client_id) means this query only ever returns the
// current user's own threads regardless of what we ask for.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThreadList } from "@/components/inbox/ThreadList";

export default async function InboxPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: inquiries } = await supabase
    .from("cm_inquiries")
    .select("id, cook_id, message, created_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const cookIds = [...new Set((inquiries ?? []).map((i) => i.cook_id))];

  const { data: cooks } = await supabase
    .from("cm_cooks")
    .select("id, business_name, profile_photo_url")
    .in("id", cookIds.length > 0 ? cookIds : ["00000000-0000-0000-0000-000000000000"]);

  const cookById = new Map((cooks ?? []).map((c) => [c.id, c]));

  const threads = (inquiries ?? []).map((inquiry) => {
    const cook = cookById.get(inquiry.cook_id);
    return {
      inquiryId: inquiry.id,
      cookId: inquiry.cook_id,
      cookName: cook?.business_name ?? "Unknown cook",
      cookPhoto: cook?.profile_photo_url ?? null,
      message: inquiry.message,
      createdAt: inquiry.created_at,
    };
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-4xl">Your inquiries</h1>
      <p className="mt-2 text-ink/70">
        Conversations happen off-platform — this is just your record of who you&rsquo;ve contacted.
      </p>
      <div className="mt-8">
        <ThreadList threads={threads} />
      </div>
    </main>
  );
}
