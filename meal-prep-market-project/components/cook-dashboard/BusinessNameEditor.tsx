// components/cook-dashboard/BusinessNameEditor.tsx
//
// Tier is intentionally read-only here — switching between In-Home and
// Delivery has real legal-compliance implications (Section 2 of the
// spec), so it's treated as a support request rather than a
// self-service toggle. First/last name and business name are both
// editable, matching what's collected at onboarding.

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TierBadge } from "@/components/shared/TierBadge";
import type { Cook } from "@/lib/types/database";

interface BusinessNameEditorProps {
  cookId: string;
  initialFirstName: string | null;
  initialLastName: string | null;
  initialBusinessName: string;
  tier: Cook["tier"];
}

export function BusinessNameEditor({
  cookId,
  initialFirstName,
  initialLastName,
  initialBusinessName,
  tier,
}: BusinessNameEditorProps) {
  const supabase = createClient();
  const [firstName, setFirstName] = useState(initialFirstName ?? "");
  const [lastName, setLastName] = useState(initialLastName ?? "");
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSave() {
    if (!businessName.trim()) return;
    setStatus("saving");

    const { error } = await supabase
      .from("cm_cooks")
      .update({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        business_name: businessName.trim(),
      })
      .eq("id", cookId);

    setStatus(error ? "error" : "saved");
  }

  return (
    <div className="space-y-4 border border-hairline p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="first_name" className="font-mono text-xs uppercase tracking-wide text-ink/70">
            First name
          </label>
          <input
            id="first_name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="border border-hairline bg-paper px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="last_name" className="font-mono text-xs uppercase tracking-wide text-ink/70">
            Last name
          </label>
          <input
            id="last_name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="border border-hairline bg-paper px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="business_name" className="font-mono text-xs uppercase tracking-wide text-ink/70">
            Business / kitchen name
          </label>
          <input
            id="business_name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="border border-hairline bg-paper px-3 py-2"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wide text-ink/70">Service type</span>
          <TierBadge tier={tier} />
          <span className="font-mono text-xs text-ink/50">Contact support to change</span>
        </div>

        <button
          onClick={handleSave}
          disabled={status === "saving"}
          className="border border-ocean px-4 py-2 font-mono text-sm text-ocean hover:bg-ocean hover:text-paper disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save"}
        </button>
      </div>

      {status === "error" && (
        <p role="alert" className="font-mono text-sm text-paprika">
          Couldn&rsquo;t save. Please try again.
        </p>
      )}
    </div>
  );
}
