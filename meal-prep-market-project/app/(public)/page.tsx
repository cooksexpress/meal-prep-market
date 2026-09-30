// app/(public)/page.tsx
//
// Home page = hero + filters + live search results, all on one route.
// This replaces the earlier separate /cooks search page (see
// app/cooks/page.tsx, now a redirect stub for old links) — the filter
// UI shown in the earlier static HTML preview was always intended to
// live on the home page, not a second route.

import { Suspense } from "react";
import { FilterBar } from "@/components/search/FilterBar";
import { SearchResultsGrid } from "@/components/search/SearchResultsGrid";
import { ResultsGridSkeleton } from "@/components/search/ResultsGridSkeleton";

interface HomePageProps {
  searchParams: Promise<{
    tier?: string;
    cuisine?: string;
    dietary?: string;
    maxPrice?: string;
    q?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-6xl px-6">
      <header className="border-b border-hairline py-16">
        <h1 className="max-w-xl font-display text-5xl leading-tight">
          Find a local cook for your weekly meal prep
        </h1>
        <p className="mt-4 max-w-md text-lg text-ink/75">
          Independent Gold Coast cooks — in your kitchen, or delivered to your door. Browse,
          message, and book directly.
        </p>
      </header>

      <div className="py-8">
        <FilterBar />
      </div>

      <Suspense key={JSON.stringify(params)} fallback={<ResultsGridSkeleton />}>
        <SearchResultsGrid searchParams={params} />
      </Suspense>

      <div className="h-16" />
    </div>
  );
}
