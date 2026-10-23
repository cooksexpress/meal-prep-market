// components/cook-profile/ReviewList.tsx

import { StarRating } from "@/components/shared/StarRating";
import { LeaveReview } from "@/components/cook-profile/LeaveReview";
import type { Review } from "@/lib/types/database";

interface ReviewListProps {
  reviews: Review[];
  cookId: string;
  cookName: string;
}

export function ReviewList({ reviews, cookId, cookName }: ReviewListProps) {
  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="scroll-mt-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="reviews-heading" className="font-display text-2xl">
          Reviews
        </h2>
      </div>

      <div className="mt-4">
        <LeaveReview cookId={cookId} cookName={cookName} />
      </div>

      {reviews.length === 0 ? (
        <p className="mt-4 text-ink/70">No reviews yet. Be the first to leave one!</p>
      ) : (
        <ul className="mt-6 space-y-6">
          {reviews.map((review) => (
            <li key={review.id} className="border-b border-hairline pb-6 last:border-none">
              <div className="flex flex-wrap items-center gap-3">
                <StarRating rating={review.rating} size="sm" />
                {review.reviewer_name && <span className="font-medium">{review.reviewer_name}</span>}
              </div>
              {review.review_text && (
                <p className="mt-2 whitespace-pre-line text-ink/80">{review.review_text}</p>
              )}
              <p className="mt-2 font-mono text-xs text-ink/50">
                {new Date(review.created_at).toLocaleDateString("en-AU", {
                  year: "numeric",
                  month: "short",
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
