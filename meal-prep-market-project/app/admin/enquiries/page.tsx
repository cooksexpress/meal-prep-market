// app/admin/enquiries/page.tsx
//
// Every enquiry customers have sent to cooks, newest first: when, which
// cook, and the customer's name, email, phone and message. Admins only
// (middleware checks cm_admins; RLS on cm_inquiries also allows admins).
// For running the site: spotting spam, checking cooks are getting
// enquiries, and helping when something goes wrong.

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    timeZone: "Australia/Brisbane",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminEnquiriesPage() {
  const supabase = await createClient();

  const [{ data: inquiries, error }, { data: cooks }] = await Promise.all([
    supabase
      .from("cm_inquiries")
      .select("id, cook_id, client_name, client_email, client_phone, message, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("cm_cooks").select("id, business_name"),
  ]);

  const cookName = new Map(
    ((cooks ?? []) as { id: string; business_name: string }[]).map((c) => [c.id, c.business_name])
  );
  const rows = (inquiries ?? []) as {
    id: string;
    cook_id: string;
    client_name: string;
    client_email: string;
    client_phone: string | null;
    message: string;
    created_at: string;
  }[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Enquiries</h1>
        <p className="mt-1 text-ink/70">
          Every message customers have sent to cooks, newest first ({rows.length}
          {rows.length === 200 ? ", showing the latest 200" : ""}). Customers shared these details
          so the cook could reply, so please only use them to run Meal Prep Market.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-paprika">
          Couldn&rsquo;t load enquiries. Please refresh and try again.
        </p>
      )}

      {rows.length === 0 && !error ? (
        <p className="text-ink/60">No enquiries yet.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border border-hairline bg-surface p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-display text-lg">
                  To <span className="text-gold">{cookName.get(row.cook_id) ?? "Unknown cook"}</span>
                </p>
                <p className="font-mono text-xs text-ink/50">{formatWhen(row.created_at)}</p>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <p>
                  <span className="text-ink/60">From:</span> {row.client_name}
                </p>
                <p>
                  <span className="text-ink/60">Email:</span>{" "}
                  <a href={`mailto:${row.client_email}`} className="text-gold underline">
                    {row.client_email}
                  </a>
                </p>
                {row.client_phone && (
                  <p>
                    <span className="text-ink/60">Phone:</span>{" "}
                    <a href={`tel:${row.client_phone}`} className="text-gold underline">
                      {row.client_phone}
                    </a>
                  </p>
                )}
              </div>
              <p className="mt-3 whitespace-pre-line rounded-xl border border-hairline bg-paper p-3 text-sm text-ink/80">
                {row.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
