// components/onboarding/ProfileForm.tsx
//
// Cuisine and dietary tags are simple comma-separated text inputs for
// v1 rather than a full tag-picker component — a reasonable MVP
// simplification given the small initial cook count, easy to upgrade
// to a proper multi-select later without a schema change (both are
// already text[] columns).

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Cook } from "@/lib/types/database";

interface ProfileFormProps {
  cookId: string;
  initial: Pick<
    Cook,
    | "bio"
    | "cuisine_tags"
    | "dietary_specialty_tags"
    | "price_range_min"
    | "price_range_max"
    | "public_contact_email"
    | "public_contact_phone"
  >;
  // Onboarding needs to move to the next wizard step on save;
  // the dashboard just wants to confirm the save happened in place.
  // Pass a path to redirect, or omit it to show inline "Saved".
  redirectTo?: string;
  submitLabel?: string;
}

export function ProfileForm({ cookId, initial, redirectTo, submitLabel }: ProfileFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [bio, setBio] = useState(initial.bio ?? "");
  const [cuisineTags, setCuisineTags] = useState(initial.cuisine_tags.join(", "));
  const [dietaryTags, setDietaryTags] = useState(initial.dietary_specialty_tags.join(", "));
  const [priceMin, setPriceMin] = useState(initial.price_range_min?.toString() ?? "");
  const [priceMax, setPriceMax] = useState(initial.price_range_max?.toString() ?? "");
  const [contactEmail, setContactEmail] = useState(initial.public_contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(initial.public_contact_phone ?? "");
  const [status, setStatus] = useState<"idle" | "submitting" | "saved" | "error">("idle");

  function parseTags(value: string): string[] {
    return value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    const { error } = await supabase
      .from("cm_cooks")
      .update({
        bio: bio.trim() || null,
        cuisine_tags: parseTags(cuisineTags),
        dietary_specialty_tags: parseTags(dietaryTags),
        price_range_min: priceMin ? Number(priceMin) : null,
        price_range_max: priceMax ? Number(priceMax) : null,
        public_contact_email: contactEmail.trim() || null,
        public_contact_phone: contactPhone.trim() || null,
      })
      .eq("id", cookId);

    if (error) {
      setStatus("error");
      return;
    }

    if (redirectTo) {
      router.push(redirectTo);
    } else {
      setStatus("saved");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="bio" className="font-mono text-xs uppercase tracking-wide text-ink/70">
          Bio
        </label>
        <textarea
          id="bio"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell clients about your style of cooking and experience."
          className="border border-hairline bg-paper px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="cuisine_tags" className="font-mono text-xs uppercase tracking-wide text-ink/70">
            Cuisine tags
          </label>
          <input
            id="cuisine_tags"
            value={cuisineTags}
            onChange={(e) => setCuisineTags(e.target.value)}
            placeholder="Italian, Modern Australian"
            className="border border-hairline bg-paper px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dietary_tags" className="font-mono text-xs uppercase tracking-wide text-ink/70">
            Dietary specialties
          </label>
          <input
            id="dietary_tags"
            value={dietaryTags}
            onChange={(e) => setDietaryTags(e.target.value)}
            placeholder="Gluten-free, High-protein / macro"
            className="border border-hairline bg-paper px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="price_min" className="font-mono text-xs uppercase tracking-wide text-ink/70">
            Price from ($/week)
          </label>
          <input
            id="price_min"
            type="number"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            className="border border-hairline bg-paper px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="price_max" className="font-mono text-xs uppercase tracking-wide text-ink/70">
            Price to ($/week)
          </label>
          <input
            id="price_max"
            type="number"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            className="border border-hairline bg-paper px-3 py-2"
          />
        </div>
      </div>

      <div className="border-t border-hairline pt-6">
        <p className="font-mono text-xs uppercase tracking-wide text-ink/70">
          Public contact details
        </p>
        <p className="mt-1 text-sm text-ink/60">
          Shown to clients who inquire, separate from your account login email.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            type="email"
            placeholder="Contact email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="border border-hairline bg-paper px-3 py-2"
          />
          <input
            type="tel"
            placeholder="Contact phone (optional)"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="border border-hairline bg-paper px-3 py-2"
          />
        </div>
      </div>

      {status === "error" && (
        <p role="alert" className="font-mono text-sm text-paprika">
          Couldn&rsquo;t save your profile. Please try again.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="bg-paprika px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "submitting"
          ? "Saving…"
          : status === "saved"
          ? "Saved"
          : submitLabel ?? "Save"}
      </button>
    </form>
  );
}
