// components/search/FilterBar.tsx
//
// Filters write straight to URL search params so results are
// shareable/bookmarkable and the results grid (a Server Component)
// can read them directly from the request — no client-side state
// duplication needed. The free-text "q" field is debounced so it
// doesn't fire a navigation/query on every keystroke.

"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const CUISINES = ["Italian", "Thai", "Modern Australian", "Indian", "Mexican", "Mediterranean"];

// Broadened per the full standard dietary/allergen category list.
const DIETARY = [
  "Gluten-Free",
  "Dairy-Free",
  "Vegan",
  "Vegetarian",
  "Keto",
  "Low-Carb",
  "Nut-Free",
  "Halal",
  "Kosher",
  "Pescatarian",
];

const QUERY_DEBOUNCE_MS = 350;

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [queryText, setQueryText] = useState(searchParams.get("q") ?? "");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Debounced push for the free-text field only — selects update
  // immediately since there's no risk of a request-per-keystroke there.
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setParam("q", queryText.trim());
    }, QUERY_DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryText]);

  return (
    <form
      className="flex flex-wrap items-end gap-4 border-b border-hairline pb-6"
      aria-label="Filter cooks"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="tier" className="font-mono text-xs uppercase tracking-wide text-ink/70">
          Service type
        </label>
        <select
          id="tier"
          defaultValue={searchParams.get("tier") ?? ""}
          onChange={(e) => setParam("tier", e.target.value)}
          className="border border-hairline bg-paper px-3 py-2 text-sm"
        >
          <option value="">Any</option>
          <option value="tier_1_in_home">In-Home</option>
          <option value="tier_2_off_site">Delivery</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cuisine" className="font-mono text-xs uppercase tracking-wide text-ink/70">
          Cuisine
        </label>
        <select
          id="cuisine"
          defaultValue={searchParams.get("cuisine") ?? ""}
          onChange={(e) => setParam("cuisine", e.target.value)}
          className="border border-hairline bg-paper px-3 py-2 text-sm"
        >
          <option value="">Any</option>
          {CUISINES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dietary" className="font-mono text-xs uppercase tracking-wide text-ink/70">
          Dietary specialty
        </label>
        <select
          id="dietary"
          defaultValue={searchParams.get("dietary") ?? ""}
          onChange={(e) => setParam("dietary", e.target.value)}
          className="border border-hairline bg-paper px-3 py-2 text-sm"
        >
          <option value="">Any</option>
          {DIETARY.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="maxPrice" className="font-mono text-xs uppercase tracking-wide text-ink/70">
          Max price
        </label>
        <input
          id="maxPrice"
          type="number"
          min={0}
          step={10}
          placeholder="$"
          defaultValue={searchParams.get("maxPrice") ?? ""}
          onChange={(e) => setParam("maxPrice", e.target.value)}
          className="w-28 border border-hairline bg-paper px-3 py-2 text-sm"
        />
      </div>

      <div className="flex min-w-[240px] flex-1 flex-col gap-1">
        <label htmlFor="q" className="font-mono text-xs uppercase tracking-wide text-ink/70">
          Allergies or specific needs
        </label>
        <input
          id="q"
          type="text"
          placeholder="e.g., nuts, salmon, dairy"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          className="border border-hairline bg-paper px-3 py-2 text-sm"
        />
        <p className="font-mono text-[11px] text-ink/50">
          Matches against each cook&rsquo;s bio, tags, and package details.
        </p>
      </div>
    </form>
  );
}
