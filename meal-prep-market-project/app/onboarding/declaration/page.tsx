// app/onboarding/declaration/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DeclarationCheckbox } from "@/components/onboarding/DeclarationCheckbox";

export default function OnboardingDeclarationPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!checked) return;

    setStatus("submitting");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/onboarding");
      return;
    }

    const { error } = await supabase
      .from("cm_cooks")
      .update({
        declaration_accepted: true,
        declaration_accepted_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      setStatus("error");
      return;
    }

    router.push("/onboarding/profile");
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-wide text-ink/50">Step 2 of 4</p>
      <h1 className="mt-2 font-display text-3xl">Compliance declaration</h1>
      <p className="mt-3 text-ink/70">
        Meal Prep Market is an advertising directory — we don&rsquo;t audit kitchens or
        verify licenses. It&rsquo;s on you to make sure you&rsquo;re operating legally for the way
        you prepare and deliver food.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <DeclarationCheckbox checked={checked} onChange={setChecked} />

        {status === "error" && (
          <p role="alert" className="font-mono text-sm text-paprika">
            Couldn&rsquo;t save that. Please try again.
          </p>
        )}

        <button
          type="submit"
          disabled={!checked || status === "submitting"}
          className="bg-paprika px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "submitting" ? "Saving…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
