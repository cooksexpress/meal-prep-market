// components/cook-dashboard/ListingStats.tsx
//
// "How your page is doing": views of the cook's listing and enquiries
// received, last 30 days (cm_my_view_stats, migration 012). Counting
// started when the visit counter was added, so early numbers are low.

interface ListingStatsProps {
  views30d: number;
  enquiries30d: number;
  viewsTotal: number;
  enquiriesTotal: number;
}

export function ListingStats({ views30d, enquiries30d, viewsTotal, enquiriesTotal }: ListingStatsProps) {
  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5">
      <h2 className="font-display text-xl">How your page is doing</h2>
      <p className="mt-1 text-sm text-ink/60">Last 30 days</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-hairline bg-paper p-4">
          <p className="font-display text-3xl text-gold">{views30d}</p>
          <p className="mt-1 text-sm text-ink/70">{views30d === 1 ? "person viewed" : "people viewed"} your page</p>
        </div>
        <div className="rounded-xl border border-hairline bg-paper p-4">
          <p className="font-display text-3xl text-gold">{enquiries30d}</p>
          <p className="mt-1 text-sm text-ink/70">{enquiries30d === 1 ? "enquiry" : "enquiries"}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink/50">
        All time: {viewsTotal} views · {enquiriesTotal} {enquiriesTotal === 1 ? "enquiry" : "enquiries"}. Share
        your link to get more people looking.
      </p>
    </section>
  );
}
