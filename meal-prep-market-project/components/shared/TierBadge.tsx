// components/shared/TierBadge.tsx
//
// The signature visual element — a small ink-stamp-style badge showing
// whether a cook works in-home or delivers. Deliberately not a generic
// rounded pill: the slight rotation and heavier border read as a
// market-stall stamp, tying back to the directory/market positioning.

import type { Cook } from "@/lib/types/database";

const LABELS: Record<Cook["tier"], string> = {
  tier_1_in_home: "In-Home",
  tier_2_off_site: "Delivery",
};

export function TierBadge({ tier }: { tier: Cook["tier"] }) {
  return <span className="tier-stamp bg-paper">{LABELS[tier]}</span>;
}
