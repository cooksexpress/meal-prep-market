// components/cook-profile/ReviewList.tsx

import { StarRating } from "@/components/shared/StarRating";
import type { Review } from "@/lib/types/database";

export function ReviewList({ reviews }: { reviews: Review[] }) {
  return (
    <section aria-labelledby="reviews-heading" className="py-8">
      <h2 id="reviews-heading" className="font-display text-2xl">
        Reviews
      </h2>

      {reviews.length === 0 ? (
        <p className="mt-4 text-ink/70">No reviews yet — be the first to work with this cook.</p>
      ) : (
        <ul className="mt-4 space-y-6">
          {reviews.map((review) => (
            <li key={review.id} className="border-b border-hairline pb-6 last:border-none">
              <StarRating rating={review.rating} size="sm" />
              {review.review_text && <p className="mt-2 text-ink/80">{review.review_text}</p>}
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
