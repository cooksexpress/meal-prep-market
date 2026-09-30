// components/admin/CookBillingTable.tsx

interface CookBillingRow {
  id: string;
  business_name: string;
  is_active: boolean;
  status: string | null;
  trial_end_at: string | null;
  grace_period_ends_at: string | null;
}

export function CookBillingTable({ rows }: { rows: CookBillingRow[] }) {
  if (rows.length === 0) {
    return <p className="text-ink/70">No cooks yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-sm">
        <thead>
          <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-ink/60">
            <th className="py-2 pr-4">Cook</th>
            <th className="py-2 pr-4">Listing</th>
            <th className="py-2 pr-4">Billing status</th>
            <th className="py-2 pr-4">Trial ends</th>
            <th className="py-2 pr-4">Grace period ends</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-hairline/60">
              <td className="py-3 pr-4">{row.business_name}</td>
              <td className="py-3 pr-4">
                <span className={row.is_active ? "text-ocean" : "text-paprika"}>
                  {row.is_active ? "Live" : "Hidden"}
                </span>
              </td>
              <td className="py-3 pr-4">{row.status ?? "—"}</td>
              <td className="py-3 pr-4">
                {row.trial_end_at ? new Date(row.trial_end_at).toLocaleDateString("en-AU") : "—"}
              </td>
              <td className="py-3 pr-4">
                {row.grace_period_ends_at
                  ? new Date(row.grace_period_ends_at).toLocaleDateString("en-AU")
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
