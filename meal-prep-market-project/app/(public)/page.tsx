// app/(public)/page.tsx
//
// Home page = hero + filters + live search results, all on one route.
// This replaces the earlier separate /cooks search page (see
// app/cooks/page.tsx, now a redirect stub for old links) — the filter
// UI shown in the earlier static HTML preview was always intended to
// live on the home page, not a second route.

import { Suspense } from "react";
import Link from "next/link";
import { FilterBar } from "@/components/search/FilterBar";
import { SearchResultsGrid } from "@/components/search/SearchResultsGrid";
import { ResultsGridSkeleton } from "@/components/search/ResultsGridSkeleton";
import { RecordView } from "@/components/shared/RecordView";

interface HomePageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q } = await searchParams;
  const params = { q };

  return (
    <div className="mx-auto max-w-6xl px-6">
      <RecordView kind="home" />
      <header className="border-b border-hairline py-16">
        <div className="mb-5 flex items-center gap-3">
          <span className="h-px w-8 bg-gold" aria-hidden="true" />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-gold">
            Gold Coast · weekly meal prep
          </span>
        </div>
        <h1 className="max-w-xl font-display text-5xl leading-tight">
          Find a local cook for your <span className="italic text-gold">weekly</span> meal prep
        </h1>
        <p className="mt-4 max-w-md text-lg text-ink/70">
          Independent Gold Coast cooks — in your kitchen, or delivered to your door. Browse,
          message, and book directly.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#browse"
            className="rounded-full bg-gold px-6 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Browse cooks
          </a>
          <Link
            href="/onboarding"
            className="rounded-full border border-ink/30 px-6 py-3 text-sm text-ink transition-colors hover:border-gold hover:text-gold"
          >
            List your cooking
          </Link>
        </div>
      </header>

      <div id="browse" className="scroll-mt-4 py-8">
        <FilterBar />
      </div>

      <Suspense key={JSON.stringify(params)} fallback={<ResultsGridSkeleton />}>
        <SearchResultsGrid searchParams={params} />
      </Suspense>

      <div className="h-16" />
    </div>
  );
}
