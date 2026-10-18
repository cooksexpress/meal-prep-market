// components/cook-profile/PackageList.tsx
//
// Read-only menu, shown on a cook's profile when they can't take
// online orders yet (clients send an inquiry instead). Cooks who can
// take payment show the same menu inside OrderCheckout, with +/-.

import Image from "next/image";
import type { Package } from "@/lib/types/database";

interface PackageListProps {
  packages: Package[];
  minOrderMeals: number | null;
}

function MenuGroup({ title, items }: { title: string; items: Package[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <p className="font-mono text-xs uppercase tracking-wide text-ink/60">{title}</p>
      <div className="mt-2 divide-y divide-hairline border-y border-hairline">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 py-4">
            {item.image_url && (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-hairline">
                <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="64px" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.name}</p>
              {item.description && <p className="mt-1 text-sm text-ink/70">{item.description}</p>}
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {item.item_type === "pack" && item.meal_count && (
                  <span className="rounded-full border border-gold/60 px-2 py-0.5 font-mono text-[11px] text-gold">
                    {item.meal_count} meals
                  </span>
                )}
                {item.dietary_tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-hairline px-2 py-0.5 font-mono text-[11px] text-ink/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            {item.indicative_price != null && (
              <p className="whitespace-nowrap font-mono text-sm text-gold">
                ${item.indicative_price.toFixed(2)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PackageList({ packages, minOrderMeals }: PackageListProps) {
  const available = packages.filter((p) => p.is_available);
  if (available.length === 0) return null;

  const dishes = available.filter((p) => p.item_type !== "pack");
  const packs = available.filter((p) => p.item_type === "pack");

  return (
    <section aria-labelledby="menu-heading" className="py-8">
      <h2 id="menu-heading" className="font-display text-2xl">
        Menu
      </h2>
      {minOrderMeals && (
        <p className="mt-1 text-sm text-ink/60">Minimum order: {minOrderMeals} meals</p>
      )}
      <MenuGroup title="Single dishes" items={dishes} />
      <MenuGroup title="Packs" items={packs} />
      <p className="mt-3 font-mono text-xs text-ink/50">
        Send an inquiry below to order or ask the cook a question.
      </p>
    </section>
  );
}
