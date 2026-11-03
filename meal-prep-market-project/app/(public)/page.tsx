// app/(public)/page.tsx
//
// Home page: a short hero with the search box and quick-search buttons
// right in the first screen (so customers see cooks quickly on a phone),
// a one-line "what is this" trust strip, the cooks, then "How it works".
// Cooks sign up from "I'm a cook" at the top, with a quiet reminder at
// the bottom.

import { Suspense } from "react";
import Link from "next/link";
import { FilterBar } from "@/components/search/FilterBar";
import { SearchResultsGrid } from "@/components/search/SearchResultsGrid";
import { ResultsGridSkeleton } from "@/components/search/ResultsGridSkeleton";
import { RecordView } from "@/components/shared/RecordView";

interface HomePageProps {
  searchParams: Promise<{ q?: string; area?: string }>;
}

const steps = [
  { title: "Browse local cooks", text: "See menus, prices and where they deliver." },
  { title: "Message them directly", text: "No sign-up. Your message goes straight to the cook." },
  { title: "Enjoy your weekly meals", text: "Sort out the details with your cook, your way." },
];

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q, area } = await searchParams;
  const params = { q, area };

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-6">
      <RecordView kind="home" />
      <header id="browse" className="scroll-mt-4 pb-6 pt-8 sm:pb-8 sm:pt-14">
        <div className="mb-3 flex items-center gap-3">
          <span className="h-px w-7 bg-gold" aria-hidden="true" />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">
            Queensland · weekly meal prep
          </span>
        </div>
        <h1 className="max-w-2xl font-display text-[2.1rem] leading-[1.12] sm:text-5xl">
          Find a local cook for your <span className="italic text-gold">weekly</span> meal prep
        </h1>
        <p className="mt-3 max-w-md text-base text-ink/70 sm:text-lg">
          Independent local cooks, delivered or in your kitchen.
        </p>

        <div className="mt-5">
          <FilterBar />
        </div>

        <ul className="mt-5 flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-hairline pt-4 text-xs text-ink/75 sm:justify-start sm:gap-x-8 sm:text-sm">
          <li>
            <span className="text-gold">✓</span> Free to use
          </li>
          <li>
            <span className="text-gold">✓</span> Message cooks directly
          </li>
          <li>
            <span className="text-gold">✓</span> Local cooks
          </li>
        </ul>
      </header>

      <Suspense key={JSON.stringify(params)} fallback={<ResultsGridSkeleton />}>
        <SearchResultsGrid searchParams={params} />
      </Suspense>

      <section className="mt-8 rounded-2xl border border-hairline p-6 sm:p-8">
        <h2 className="font-display text-2xl">How it works</h2>
        <ol className="mt-5 grid gap-5 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-semibold text-paper">
                {i + 1}
              </span>
              <p className="text-sm text-ink/80">
                <span className="block font-medium text-ink">{step.title}</span>
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-10 border-t border-hairline pb-14 pt-8 text-center text-sm text-ink/60">
        Are you a cook?{" "}
        <Link href="/onboarding" className="text-gold underline">
          List your cooking for free →
        </Link>
      </p>
    </div>
  );
}
