// components/cook-profile/ProfileHeader.tsx

import Image from "next/image";
import { StarRating } from "@/components/shared/StarRating";
import { TierBadge } from "@/components/shared/TierBadge";
import { formatCookDisplayName } from "@/lib/utils/formatCookName";
import type { Cook } from "@/lib/types/database";

interface ProfileHeaderProps {
  cook: Cook;
  averageRating: number;
  reviewCount: number;
}

export function ProfileHeader({ cook, averageRating, reviewCount }: ProfileHeaderProps) {
  const priceLabel =
    cook.price_range_min && cook.price_range_max
      ? `$${cook.price_range_min}–$${cook.price_range_max} / week`
      : "Price on inquiry";

  return (
    <header className="flex flex-col gap-6 border-b border-hairline pb-8 sm:flex-row sm:items-start">
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-2 border-ink/70 bg-hairline/40">
        {cook.profile_photo_url ? (
          <Image
            src={cook.profile_photo_url}
            alt={formatCookDisplayName(cook)}
            fill
            className="object-cover"
            sizes="112px"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-[10px] text-ink/50">
            No photo
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl">{formatCookDisplayName(cook)}</h1>
          <TierBadge tier={cook.tier} />
        </div>

        <StarRating rating={averageRating} reviewCount={reviewCount} />

        {cook.bio && <p className="max-w-2xl text-ink/80">{cook.bio}</p>}

        <div className="flex flex-wrap gap-1.5 pt-1">
          {cook.cuisine_tags.map((tag) => (
            <span key={tag} className="border border-hairline px-2 py-0.5 font-mono text-[11px] text-ink/70">
              {tag}
            </span>
          ))}
          {cook.dietary_specialty_tags.map((tag) => (
            <span
              key={tag}
              className="border border-ocean/40 bg-ocean/5 px-2 py-0.5 font-mono text-[11px] text-ocean"
            >
              {tag}
            </span>
          ))}
        </div>

        <p className="font-mono text-sm text-ocean">{priceLabel}</p>
      </div>
    </header>
  );
}
