// app/onboarding/declaration/page.tsx
//
// Last sign-up step: "Go live". A short, friendly checklist (food safety
// training, insurance, Queensland food rules), one tick box, and one
// button that both records the declaration and puts the listing live
// (cm_start_free_trial). A "Not sure what you need?" guide explains each
// item so cooks who aren't set up yet know how to get there.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DeclarationCheckbox } from "@/components/onboarding/DeclarationCheckbox";

const checklist = [
  "I have food safety training (like a Food Safety Supervisor certificate)",
  "I have public liability insurance",
  "I follow Queensland food rules for the way I cook and deliver (for example, a council food business licence if I need one)",
];

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

    // Same tap puts the listing live (free, no card).
    const { error: liveError } = await supabase.rpc("cm_start_free_trial");
    if (liveError) {
      setStatus("error");
      return;
    }

    router.push("/onboarding/complete");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-wide text-ink/50">Step 3 of 3 · last step</p>
      <h1 className="mt-2 font-display text-3xl">Go live</h1>
      <p className="mt-3 text-ink/70">
        You&rsquo;re nearly there. Before your page goes live, please confirm:
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <ul className="space-y-3 rounded-2xl border border-hairline bg-surface p-5 text-sm text-ink/85">
          {checklist.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-0.5 text-gold" aria-hidden="true">
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <details className="rounded-2xl border border-hairline p-5 text-sm text-ink/80">
          <summary className="cursor-pointer font-medium text-gold">Not sure what you need?</summary>
          <div className="mt-3 space-y-3">
            <p>
              <span className="font-medium text-ink">Food safety training.</span> A Food Safety
              Supervisor certificate is a short course you can usually do online, often in a day,
              through a registered training provider.
            </p>
            <p>
              <span className="font-medium text-ink">Public liability insurance.</span> Covers you
              if something goes wrong. Many insurers offer small-business or home-food cover; an
              insurance broker can help you find one.
            </p>
            <p>
              <span className="font-medium text-ink">Queensland food rules.</span> If you make and
              sell food from home, you may need a food business licence from your local council.
              Your council&rsquo;s website explains what applies to you.
            </p>
            <p className="text-ink/60">
              Not set up yet? No problem. Your page is saved. Come back and sign in with your email
              when you&rsquo;re ready, and you&rsquo;ll land right back here.
            </p>
          </div>
        </details>

        <DeclarationCheckbox checked={checked} onChange={setChecked} />

        {status === "error" && (
          <p role="alert" className="font-mono text-sm text-paprika">
            Couldn&rsquo;t put your page live. Please try again.
          </p>
        )}

        <button
          type="submit"
          disabled={!checked || status === "submitting"}
          className="w-full rounded-full bg-gold px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "submitting" ? "Going live…" : "Put my listing live"}
        </button>
        <p className="text-center text-xs text-ink/50">Free to join. No card needed.</p>
      </form>
    </main>
  );
}
