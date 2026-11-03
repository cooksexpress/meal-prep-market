// components/search/CookCard.tsx

import Image from "next/image";
import Link from "next/link";
import { StarRating } from "@/components/shared/StarRating";
import { TierBadge } from "@/components/shared/TierBadge";
import { isOrdersPaused, priceFromLabel } from "@/lib/cooks/availability";
import { formatCookDisplayName } from "@/lib/utils/formatCookName";
import type { Cook } from "@/lib/types/database";

interface CookCardProps {
  cook: Cook;
  averageRating: number;
  reviewCount: number;
}

// Tags like "Any" or "None" don't tell customers anything, so skip them.
const EMPTY_TAGS = new Set(["any", "none", "n/a", "na", "-"]);
const realTags = (tags: string[]) => tags.filter((t) => t.trim() && !EMPTY_TAGS.has(t.trim().toLowerCase()));

export function CookCard({ cook, averageRating, reviewCount }: CookCardProps) {
  const priceLabel = priceFromLabel(cook.price_range_min);
  // One tidy line: area, then up to one cuisine and one dietary tag.
  const meta = [
    cook.region ? `📍 ${cook.region}` : null,
    realTags(cook.cuisine_tags)[0] ?? null,
    realTags(cook.dietary_specialty_tags)[0] ?? null,
  ].filter(Boolean) as string[];

  return (
    <Link
      href={`/cooks/${cook.id}`}
      className="group block overflow-hidden rounded-2xl border border-hairline bg-surface transition-colors hover:border-gold/60 focus-visible:outline-2 focus-visible:outline-ocean"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-hairline bg-hairline/40">
        {cook.profile_photo_url ? (
          <Image
            src={cook.profile_photo_url}
            alt={formatCookDisplayName(cook)}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-xs text-ink/50">
            No photo yet
          </div>
        )}
        <div className="absolute right-3 top-3">
          <TierBadge tier={cook.tier} />
        </div>
        {isOrdersPaused(cook) && (
          <div className="absolute bottom-3 left-3 rounded-full bg-paper/90 px-3 py-1 text-xs text-gold">
            Orders paused
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-display text-xl leading-tight">{formatCookDisplayName(cook)}</h3>
        {meta.length > 0 && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-ink/65">
            {meta.map((item, i) => (
              <span key={item} className="flex items-center gap-2">
                {i > 0 && (
                  <span className="text-ink/30" aria-hidden="true">
                    •
                  </span>
                )}
                {item}
              </span>
            ))}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {reviewCount > 0 ? (
            <StarRating rating={averageRating} reviewCount={reviewCount} size="sm" />
          ) : (
            <span className="inline-block rounded-full border border-gold/60 px-2.5 py-0.5 text-xs text-gold">
              New to Meal Prep Market
            </span>
          )}
          <p className="font-mono text-sm text-gold">{priceLabel}</p>
        </div>
      </div>
    </Link>
  );
}
