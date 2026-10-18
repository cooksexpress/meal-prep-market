// components/search/FilterBar.tsx
//
// One simple search box above the cooks list. Writes to the "q" URL
// param (debounced) so the results grid, a Server Component, can read
// it straight from the request. Service type, cuisine, dietary and
// price are shown on each cook's listing instead of as filters.

"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const QUERY_DEBOUNCE_MS = 350;

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [queryText, setQueryText] = useState(searchParams.get("q") ?? "");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setQuery = useCallback(
    (value: string) => {
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

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
    <form
      className="border-b border-hairline pb-6"
      aria-label="Search cooks"
      role="search"
      onSubmit={(e) => e.preventDefault()}
    >
      <label htmlFor="q" className="font-mono text-xs uppercase tracking-wide text-ink/70">
        Search cooks
      </label>
      <input
        id="q"
        type="search"
        placeholder="e.g. gluten free, high protein, Robina"
        value={queryText}
        onChange={(e) => setQueryText(e.target.value)}
        className="mt-1 w-full max-w-xl rounded-full border border-hairline bg-paper px-5 py-3 text-base"
      />
    </form>
  );
}
