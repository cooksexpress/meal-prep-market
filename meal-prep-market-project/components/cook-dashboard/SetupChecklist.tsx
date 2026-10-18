// components/cook-dashboard/SetupChecklist.tsx
//
// A simple list on the dashboard of what's done and what's left, each
// with a link to the right page. Hides itself once everything's done.

import Link from "next/link";

export interface ChecklistItem {
  label: string;
  done: boolean;
  href: string;
  hint: string;
}

export function SetupChecklist({ items }: { items: ChecklistItem[] }) {
  const doneCount = items.filter((i) => i.done).length;
  if (doneCount === items.length) return null;

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl">Finish your listing</h2>
        <span className="font-mono text-xs text-ink/60">
          {doneCount} of {items.length} done
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-hairline">
        <div className="h-full bg-gold" style={{ width: `${(doneCount / items.length) * 100}%` }} />
      </div>
      <ul className="mt-4 divide-y divide-hairline">
        {items.map((item) => (
          <li key={item.label}>
            <Link href={item.href} className="flex items-center gap-3 py-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                  item.done ? "border-gold bg-gold text-paper" : "border-hairline text-transparent"
                }`}
                aria-hidden
              >
                ✓
              </span>
              <span className="min-w-0 flex-1">
                <span className={item.done ? "text-ink/50 line-through" : "text-ink"}>{item.label}</span>
                {!item.done && <span className="block text-sm text-ink/50">{item.hint}</span>}
              </span>
              {!item.done && <span className="text-sm text-gold">Add ›</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
