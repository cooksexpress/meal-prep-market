// components/search/ResultsGridSkeleton.tsx

export function ResultsGridSkeleton() {
  return (
    <div>
      <div className="mt-6 h-3 w-24 animate-pulse bg-hairline" />
      <div className="grid grid-cols-1 gap-6 py-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border border-hairline">
            <div className="aspect-[4/3] w-full animate-pulse bg-hairline/50" />
            <div className="space-y-2 p-4">
              <div className="h-5 w-3/4 animate-pulse bg-hairline" />
              <div className="h-3 w-1/2 animate-pulse bg-hairline/70" />
              <div className="h-3 w-2/3 animate-pulse bg-hairline/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
