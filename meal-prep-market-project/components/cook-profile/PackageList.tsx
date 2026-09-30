// components/cook-profile/PackageList.tsx

import type { Package } from "@/lib/types/database";

export function PackageList({ packages }: { packages: Package[] }) {
  if (packages.length === 0) return null;

  return (
    <section aria-labelledby="packages-heading" className="py-8">
      <h2 id="packages-heading" className="font-display text-2xl">
        Sample packages
      </h2>
      <div className="mt-4 divide-y divide-hairline border-y border-hairline">
        {packages.map((pkg) => (
          <div key={pkg.id} className="flex items-baseline justify-between gap-4 py-4">
            <div>
              <p className="font-medium">{pkg.name}</p>
              {pkg.description && <p className="mt-1 text-sm text-ink/70">{pkg.description}</p>}
              {pkg.meal_count && (
                <p className="mt-1 font-mono text-xs text-ink/50">{pkg.meal_count} meals</p>
              )}
            </div>
            {pkg.indicative_price && (
              <p className="whitespace-nowrap font-mono text-sm text-ocean">
                ~${pkg.indicative_price}
              </p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-xs text-ink/50">
        Indicative pricing only — confirm final cost directly with the cook.
      </p>
    </section>
  );
}
