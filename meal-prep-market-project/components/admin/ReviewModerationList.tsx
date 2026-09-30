// components/admin/ReviewModerationList.tsx

"use client";

import { useState, useTransition } from "react";
import { hideReview, unhideReview } from "@/app/admin/actions";

interface ReviewRow {
  id: string;
  cook_business_name: string;
  rating: number;
  review_text: string | null;
  is_hidden: boolean;
  hidden_reason: string | null;
  created_at: string;
}

export function ReviewModerationList({ reviews }: { reviews: ReviewRow[] }) {
  const [search, setSearch] = useState("");
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const filtered = reviews.filter(
    (r) =>
      r.cook_business_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.review_text ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input
        type="search"
        placeholder="Search by cook name or review text…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-hairline bg-paper px-3 py-2 font-mono text-sm"
      />

      <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
        {filtered.map((review) => (
          <li key={review.id} className="py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">
                {review.cook_business_name} — {review.rating}★
              </p>
              <span className={`font-mono text-xs ${review.is_hidden ? "text-paprika" : "text-ocean"}`}>
                {review.is_hidden ? "Hidden" : "Visible"}
              </span>
            </div>
            {review.review_text && <p className="mt-1 text-ink/80">{review.review_text}</p>}
            {review.is_hidden && review.hidden_reason && (
              <p className="mt-1 font-mono text-xs text-ink/50">Reason: {review.hidden_reason}</p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {review.is_hidden ? (
                <button
                  disabled={isPending}
                  onClick={() => startTransition(() => unhideReview(review.id))}
                  className="font-mono text-xs text-ocean underline disabled:opacity-50"
                >
                  Restore review
                </button>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Reason for removal (shown internally only)"
                    value={reasonDraft[review.id] ?? ""}
                    onChange={(e) =>
                      setReasonDraft((prev) => ({ ...prev, [review.id]: e.target.value }))
                    }
                    className="border border-hairline bg-paper px-2 py-1 font-mono text-xs"
                  />
                  <button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() => hideReview(review.id, reasonDraft[review.id] ?? ""))
                    }
                    className="font-mono text-xs text-paprika underline disabled:opacity-50"
                  >
                    Hide review
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
