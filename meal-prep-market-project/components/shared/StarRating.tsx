// components/shared/StarRating.tsx

"use client";

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  reviewCount?: number;
  size?: "sm" | "md";
}

export function StarRating({ rating, onChange, reviewCount, size = "md" }: StarRatingProps) {
  const isInteractive = typeof onChange === "function";
  const starSize = size === "sm" ? "text-sm" : "text-lg";

  return (
    <div className="flex items-center gap-1" role={isInteractive ? "radiogroup" : "img"} aria-label={`${rating} out of 5 stars`}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((value) => {
          const filled = value <= Math.round(rating);
          const Star = (
            <span
              key={value}
              className={`${starSize} ${filled ? "text-butter" : "text-hairline"} ${
                isInteractive ? "cursor-pointer" : ""
              }`}
              aria-hidden="true"
            >
              ★
            </span>
          );

          if (!isInteractive) return Star;

          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={value === Math.round(rating)}
              aria-label={`${value} star${value > 1 ? "s" : ""}`}
              onClick={() => onChange?.(value)}
              className="focus-visible:outline-2 focus-visible:outline-ocean rounded"
            >
              {Star}
            </button>
          );
        })}
      </div>
      {typeof reviewCount === "number" && (
        <span className="font-mono text-xs text-ink/60">({reviewCount})</span>
      )}
    </div>
  );
}
