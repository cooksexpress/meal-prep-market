// components/search/FilterBar.tsx
//
// The search box in the homepage hero, plus quick-search buttons
// (High protein, Vegan...). Writes to the "q" URL param (debounced) so
// the results grid, a Server Component, can read it straight from the
// request. Tapping a highlighted button again clears the search.
// City buttons (Gold Coast, Sydney...) show only for cities with enough
// live cooks (worked out on the homepage), and only when 2+ qualify.

"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const QUERY_DEBOUNCE_MS = 350;

// Quick searches: label shown, and the words searched for.
const QUICK = [
  { label: "💪 High protein", q: "protein" },
  { label: "🌱 Vegan", q: "vegan" },
  { label: "🌾 Gluten-free", q: "gluten" },
  { label: "👨‍👩‍👧 Family meals", q: "family" },
  { label: "🥑 Keto", q: "keto" },
];

export function FilterBar({ areas = [] }: { areas?: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [queryText, setQueryText] = useState(searchParams.get("q") ?? "");
  const area = searchParams.get("area") ?? "";
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback(
    (nextQ: string, nextArea: string) => {
      const params = new URLSearchParams();
      if (nextQ) params.set("q", nextQ);
      if (nextArea) params.set("area", nextArea);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  const setQuery = (value: string) => go(value, area);

  useEffect(() => {
    if ((searchParams.get("q") ?? "") === queryText.trim()) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setQuery(queryText.trim()), QUERY_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryText]);

  return (
    <form aria-label="Search cooks" role="search" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="q" className="sr-only">
        Search cooks
      </label>
      <div className="relative max-w-xl">
        <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink/50" aria-hidden="true">
          🔍
        </span>
        <input
          id="q"
          type="search"
          placeholder="Search a cuisine, diet or suburb"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          className="w-full rounded-full border-[1.5px] border-gold bg-surface py-3.5 pl-12 pr-5 text-base placeholder:text-ink/45"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK.map((chip) => {
          const selected = queryText.trim().toLowerCase() === chip.q;
          return (
            <button
              key={chip.q}
              type="button"
              aria-pressed={selected}
              onClick={() => setQueryText(selected ? "" : chip.q)}
              className={`rounded-full px-3.5 py-2 text-sm transition-colors ${
                selected
                  ? "bg-gold font-medium text-paper"
                  : "border border-hairline bg-surface text-ink/80 hover:border-gold hover:text-gold"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
      {areas.length >= 2 && (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Choose a city">
          {areas.map((option) => {
            const selected = area === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => go(queryText.trim(), selected ? "" : option)}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  selected
                    ? "bg-gold font-medium text-paper"
                    : "border border-gold/50 text-gold hover:bg-gold hover:text-paper"
                }`}
              >
                {selected ? `✓ 📍 ${option}` : `📍 ${option}`}
              </button>
            );
          })}
        </div>
      )}
    </form>
  );
}
