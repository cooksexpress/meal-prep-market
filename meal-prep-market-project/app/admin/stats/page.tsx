// app/admin/stats/page.tsx
//
// Visitors: how many people opened the homepage and cooks' pages, and
// how many enquiries were sent (migration 012). Admins only (middleware
// checks cm_admins; the database functions check again).

import { createClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/stats/rpc";

export const dynamic = "force-dynamic";

interface DayRow {
  day: string;
  home_views: number;
  cook_views: number;
  enquiries: number;
}

interface CookRow {
  cook_id: string;
  business_name: string;
  is_active: boolean;
  views_30d: number;
  views_total: number;
  enquiries_30d: number;
  enquiries_total: number;
}

function sum(rows: DayRow[], n: number, pick: (r: DayRow) => number) {
  return rows.slice(0, n).reduce((total, r) => total + Number(pick(r)), 0);
}

function formatDay(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function AdminStatsPage() {
  const supabase = await createClient();
  const [{ data: daysRaw, error }, { data: cooksRaw }] = await Promise.all([
    callRpc(supabase, "cm_admin_stats", { p_days: 30 }),
    callRpc(supabase, "cm_admin_cook_stats"),
  ]);

  if (error) {
    return (
      <div>
        <h1 className="font-display text-3xl">Visitors</h1>
        <p className="mt-4 text-paprika">
          Couldn&rsquo;t load the numbers. Check that the visitor counter SQL has been run in Supabase.
        </p>
      </div>
    );
  }

  const days = (daysRaw ?? []) as DayRow[]; // newest first
  const cooks = (cooksRaw ?? []) as CookRow[];
  const visits = (r: DayRow) => Number(r.home_views) + Number(r.cook_views);

  const tiles = [
    { label: "Today", visits: sum(days, 1, visits), enquiries: sum(days, 1, (r) => r.enquiries) },
    { label: "Last 7 days", visits: sum(days, 7, visits), enquiries: sum(days, 7, (r) => r.enquiries) },
    { label: "Last 30 days", visits: sum(days, 30, visits), enquiries: sum(days, 30, (r) => r.enquiries) },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl">Visitors</h1>
        <p className="mt-1 text-ink/70">
          Page views on the homepage and cooks&rsquo; pages, plus enquiries sent. Counting started when
          this page was added. Your own visits while signed in as admin aren&rsquo;t counted.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-hairline bg-surface p-5">
            <p className="font-mono text-xs uppercase tracking-wide text-ink/60">{t.label}</p>
            <p className="mt-2 font-display text-3xl text-gold">{t.visits}</p>
            <p className="text-sm text-ink/70">page views</p>
            <p className="mt-2 text-sm text-ink/70">
              {t.enquiries} {t.enquiries === 1 ? "enquiry" : "enquiries"}
            </p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="font-display text-xl">Each cook (last 30 days)</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-hairline text-left font-mono text-xs uppercase tracking-wide text-ink/60">
                <th className="py-2 pr-4">Cook</th>
                <th className="py-2 pr-4">Views</th>
                <th className="py-2 pr-4">Enquiries</th>
                <th className="py-2 pr-4">All time</th>
              </tr>
            </thead>
            <tbody>
              {cooks.map((c) => (
                <tr key={c.cook_id} className="border-b border-hairline/60">
                  <td className="py-3 pr-4">
                    {c.business_name}
                    {!c.is_active && <span className="ml-2 font-mono text-xs text-paprika">hidden</span>}
                  </td>
                  <td className="py-3 pr-4">{Number(c.views_30d)}</td>
                  <td className="py-3 pr-4">{Number(c.enquiries_30d)}</td>
                  <td className="py-3 pr-4 text-ink/60">
                    {Number(c.views_total)} views · {Number(c.enquiries_total)} enq.
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl">Day by day</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-hairline text-left font-mono text-xs uppercase tracking-wide text-ink/60">
                <th className="py-2 pr-4">Day</th>
                <th className="py-2 pr-4">Homepage</th>
                <th className="py-2 pr-4">Cook pages</th>
                <th className="py-2 pr-4">Enquiries</th>
              </tr>
            </thead>
            <tbody>
              {days.slice(0, 14).map((d) => (
                <tr key={d.day} className="border-b border-hairline/60">
                  <td className="py-2 pr-4">{formatDay(d.day)}</td>
                  <td className="py-2 pr-4">{Number(d.home_views)}</td>
                  <td className="py-2 pr-4">{Number(d.cook_views)}</td>
                  <td className="py-2 pr-4">{Number(d.enquiries)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
