// app/onboarding/tier/page.tsx
//
// First real onboarding step (after the magic link lands the cook
// here, authenticated). Collects business_name + tier together since
// business_name is NOT NULL on cm_cooks — this is the minimum viable
// insert. is_active is force-set to false by the cm_protect_is_active
// trigger regardless of what we send, so there's nothing to worry
// about here on that front.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TierSelector } from "@/components/onboarding/TierSelector";
import type { Cook } from "@/lib/types/database";

export default function OnboardingTierPage() {
  const router = useRouter();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [tier, setTier] = useState<Cook["tier"] | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "submitting" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill if the cook already started this step before (e.g. came
  // back after closing the tab).
  useEffect(() => {
    async function loadExisting() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("cm_cooks")
        .select("first_name, last_name, business_name, tier")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setBusinessName(data.business_name);
        setTier(data.tier);
      }
      setStatus("idle");
    }
    loadExisting();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!tier) {
      setErrorMessage("Please select a service type.");
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/onboarding");
      return;
    }

    const { error } = await supabase.from("cm_cooks").upsert(
      {
        id: user.id,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        business_name: businessName.trim(),
        tier,
      },
      { onConflict: "id" }
    );

    if (error) {
      setStatus("error");
      setErrorMessage("Couldn't save that. Please try again.");
      return;
    }

    router.push("/onboarding/declaration");
  }

  if (status === "loading") {
    return <main className="mx-auto max-w-lg px-6 py-16 text-ink/60">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-wide text-ink/50">Step 1 of 4</p>
      <h1 className="mt-2 font-display text-3xl">Tell us about your kitchen</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="first_name" className="font-mono text-xs uppercase tracking-wide text-ink/70">
              Your first name
            </label>
            <input
              id="first_name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="border border-hairline bg-paper px-3 py-2"
            />
            <p className="font-mono text-[11px] text-ink/50">
              Shown to clients alongside your kitchen name, e.g. &ldquo;Eleni — Salt &amp; Sage Kitchen&rdquo;.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="last_name" className="font-mono text-xs uppercase tracking-wide text-ink/70">
              Last name (optional)
            </label>
            <input
              id="last_name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="border border-hairline bg-paper px-3 py-2"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="business_name" className="font-mono text-xs uppercase tracking-wide text-ink/70">
            Business / cook name
          </label>
          <input
            id="business_name"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="border border-hairline bg-paper px-3 py-2"
          />
        </div>

        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wide text-ink/70">Service type</p>
          <TierSelector value={tier} onChange={setTier} />
        </div>

        {errorMessage && (
          <p role="alert" className="font-mono text-sm text-paprika">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="bg-paprika px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "submitting" ? "Saving…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
