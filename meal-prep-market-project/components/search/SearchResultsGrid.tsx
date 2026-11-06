// components/search/SearchResultsGrid.tsx
//
// Server Component — queries cm_cooks (public, is_active only) directly
// with the anon key, filtered by whatever's in the URL search params.
// Review aggregates are computed here rather than per-card to avoid an
// N+1 query against cm_reviews for every result.
//
// The "q" keyword search runs in the database (cm_search_cooks): every
// word must appear in the cook's name, bio, tags, areas, region, or a
// menu item. A simple substring match, fine at this scale.

import { createClient } from "@/lib/supabase/server";
import { CookCard } from "./CookCard";
import { callRpc } from "@/lib/stats/rpc";
import Link from "next/link";
import { REGIONS } from "@/lib/cooks/regions";

interface SearchResultsGridProps {
  searchParams: {
    q?: string;
    area?: string;
  };
}

export async function SearchResultsGrid({ searchParams }: SearchResultsGridProps) {
  const supabase = await createClient();

  // Search runs in the database (cm_search_cooks, migration 014): every
  // word typed must appear somewhere in the cook's listing or menu.
  const q = searchParams.q?.trim().slice(0, 100) ?? "";
  let matchedIds: string[] | null = null;
  let searchFailed = false;
  if (q) {
    const { data, error: searchError } = await callRpc(supabase, "cm_search_cooks", { p_q: q });
    if (searchError) {
      searchFailed = true;
    } else {
      matchedIds = ((data ?? []) as unknown[]).map((row) =>
        typeof row === "string" ? row : String((row as Record<string, unknown>).cm_search_cooks ?? "")
      );
    }
  }

  let query = supabase
    .from("cm_cooks")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // City buttons (shown once a city has enough cooks): only cooks there.
  const area = REGIONS.includes(searchParams.area ?? "") ? searchParams.area! : null;
  if (area) {
    query = query.eq("region", area);
  }

  if (matchedIds !== null) {
    // No matches: ask for an impossible id so the "0 cooks found" message shows.
    query = query.in("id", matchedIds.length > 0 ? matchedIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data: cooksRaw, error: loadError } = await query;
  const error = searchFailed || loadError;
  const cooks = cooksRaw;

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
        <p className="mt-2 font-display text-2xl">
          {area ? `No ${area} cooks match that yet` : "No cooks match that search yet"}
        </p>
        <p className="mt-2 text-ink/70">Try widening your search, or check back soon. New cooks join every week.</p>
        {area && (
          <Link
            href={q ? `/?q=${encodeURIComponent(q)}` : "/"}
            scroll={false}
            className="mt-5 inline-block rounded-full border border-gold px-5 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-paper"
          >
            See all cooks
          </Link>
        )}
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
      <p className="pt-2 font-mono text-xs uppercase tracking-wide text-ink/55">
        {q
          ? `${cooks.length} ${cooks.length === 1 ? "cook" : "cooks"} found`
          : `${cooks.length} local ${cooks.length === 1 ? "cook" : "cooks"}`}
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
