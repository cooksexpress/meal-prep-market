// components/search/CookCard.tsx

import Image from "next/image";
import Link from "next/link";
import { StarRating } from "@/components/shared/StarRating";
import { TierBadge } from "@/components/shared/TierBadge";
import { formatCookDisplayName } from "@/lib/utils/formatCookName";
import type { Cook } from "@/lib/types/database";

interface CookCardProps {
  cook: Cook;
  averageRating: number;
  reviewCount: number;
}

export function CookCard({ cook, averageRating, reviewCount }: CookCardProps) {
  const priceLabel =
    cook.price_range_min && cook.price_range_max
      ? `$${cook.price_range_min}–$${cook.price_range_max} / week`
      : "Price on inquiry";

  return (
    <Link
      href={`/cooks/${cook.id}`}
      className="group block border border-hairline bg-paper transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ocean"
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
      </div>

      <div className="space-y-2 p-4">
        <h3 className="font-display text-xl leading-tight">{formatCookDisplayName(cook)}</h3>
        <StarRating rating={averageRating} reviewCount={reviewCount} size="sm" />
        <div className="flex flex-wrap gap-1.5">
          {cook.cuisine_tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="border border-hairline px-2 py-0.5 font-mono text-[11px] text-ink/70"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="font-mono text-sm text-ocean">{priceLabel}</p>
      </div>
    </Link>
  );
}
