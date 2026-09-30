// components/onboarding/TierSelector.tsx

"use client";

import type { Cook } from "@/lib/types/database";

interface TierSelectorProps {
  value: Cook["tier"] | null;
  onChange: (tier: Cook["tier"]) => void;
}

const OPTIONS: { value: Cook["tier"]; label: string; description: string }[] = [
  {
    value: "tier_1_in_home",
    label: "In-Home",
    description: "You travel to the client's home and cook using their kitchen and supplies.",
  },
  {
    value: "tier_2_off_site",
    label: "Delivery",
    description: "You prepare meals off-site in your own kitchen and deliver them to the client.",
  },
];

export function TierSelector({ value, onChange }: TierSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Service type">
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`border p-5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ocean ${
              selected ? "border-ocean bg-ocean/5" : "border-hairline hover:border-ink/40"
            }`}
          >
            <p className="font-display text-xl">{option.label}</p>
            <p className="mt-2 text-sm text-ink/70">{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}
