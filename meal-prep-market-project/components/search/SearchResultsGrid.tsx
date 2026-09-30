// components/search/SearchResultsGrid.tsx
//
// Server Component — queries cm_cooks (public, is_active only) directly
// with the anon key, filtered by whatever's in the URL search params.
// Review aggregates are computed here rather than per-card to avoid an
// N+1 query against cm_reviews for every result.
//
// The "q" (allergy/keyword) param is matched against bio, cuisine_tags,
// dietary_specialty_tags, AND cm_packages.name/description — the last
// of those requires a separate lookup since packages live in their own
// table. This is a pragmatic substring (ilike) match, not ranked
// full-text search — fine for the cook counts expected at MVP scale,
// but worth upgrading to Postgres full-text search / pg_trgm if the
// catalog grows large enough that substring scans get slow.

import { createClient } from "@/lib/supabase/server";
import { CookCard } from "./CookCard";

interface SearchResultsGridProps {
  searchParams: {
    tier?: string;
    cuisine?: string;
    dietary?: string;
    maxPrice?: string;
    q?: string;
  };
}

export async function SearchResultsGrid({ searchParams }: SearchResultsGridProps) {
  const supabase = await createClient();

  // Escape PostgREST/ilike special characters (%, _, ,) out of
  // user-supplied text before interpolating into a filter string.
  const sanitizeForIlike = (value: string) =>
    value.replace(/[%_,]/g, (char) => `\\${char}`);

  let packageMatchedCookIds: string[] = [];
  if (searchParams.q) {
    const keyword = sanitizeForIlike(searchParams.q.trim());
    const { data: matchedPackages } = await supabase
      .from("cm_packages")
      .select("cook_id")
      .or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%`);

    packageMatchedCookIds = [...new Set((matchedPackages ?? []).map((p) => p.cook_id))];
  }

  let query = supabase
    .from("cm_cooks")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (searchParams.tier) {
    query = query.eq("tier", searchParams.tier);
  }
  if (searchParams.cuisine) {
    query = query.contains("cuisine_tags", [searchParams.cuisine]);
  }
  if (searchParams.dietary) {
    query = query.contains("dietary_specialty_tags", [searchParams.dietary]);
  }
  if (searchParams.maxPrice) {
    query = query.lte("price_range_min", Number(searchParams.maxPrice));
  }

  if (searchParams.q) {
    const keyword = sanitizeForIlike(searchParams.q.trim());
    // Union three sources of a match into one OR clause: bio text,
    // the two tag arrays (cast to text for a substring check), and
    // any cook whose package name/description matched above.
    //
    // NOTE: `column::text.ilike.value` relies on PostgREST's inline
    // cast support in filter strings. This works on current PostgREST
    // versions, but verify against your actual deployed Supabase
    // project before shipping — if it errors, the fallback is to drop
    // the two tag clauses here and instead pre-filter by tag match in
    // a separate query the same way packageMatchedCookIds works below.
    const orClauses = [
      `bio.ilike.%${keyword}%`,
      `cuisine_tags::text.ilike.%${keyword}%`,
      `dietary_specialty_tags::text.ilike.%${keyword}%`,
    ];
    if (packageMatchedCookIds.length > 0) {
      orClauses.push(`id.in.(${packageMatchedCookIds.join(",")})`);
    }
    query = query.or(orClauses.join(","));
  }

  const { data: cooks, error } = await query;

  if (error) {
    return (
      <p className="py-12 text-center font-mono text-sm text-paprika">
        Something went wrong loading cooks. Please try again.
      </p>
    );
  }

  if (!cooks || cooks.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-wide text-ink/50">0 cooks found</p>
        <p className="mt-2 font-display text-2xl">No cooks match those filters yet</p>
        <p className="mt-2 text-ink/70">Try widening your search, or check back soon — new cooks join every week.</p>
      </div>
    );
  }

  // Fetch review aggregates for the returned cooks in one query.
  const cookIds = cooks.map((c) => c.id);
  const { data: reviews } = await supabase
    .from("cm_reviews")
    .select("cook_id, rating")
    .in("cook_id", cookIds)
    .eq("is_hidden", false);

  const aggregates = new Map<string, { total: number; count: number }>();
  for (const r of reviews ?? []) {
    const current = aggregates.get(r.cook_id) ?? { total: 0, count: 0 };
    current.total += r.rating;
    current.count += 1;
    aggregates.set(r.cook_id, current);
  }

  return (
    <div>
      <p className="pt-6 font-mono text-xs uppercase tracking-wide text-ink/50">
        {cooks.length} {cooks.length === 1 ? "cook" : "cooks"} found
      </p>
      <div className="grid grid-cols-1 gap-6 py-4 sm:grid-cols-2 lg:grid-cols-3">
        {cooks.map((cook) => {
          const agg = aggregates.get(cook.id);
          const averageRating = agg ? agg.total / agg.count : 0;
          return (
            <CookCard
              key={cook.id}
              cook={cook}
              averageRating={averageRating}
              reviewCount={agg?.count ?? 0}
            />
          );
        })}
      </div>
    </div>
  );
}
