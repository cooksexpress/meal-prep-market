// components/cook-profile/InquiryForm.tsx
//
// Guest inquiry form — no auth required to submit. POSTs to the
// submit-inquiry Edge Function (via lib/api/submitInquiry), which
// creates the client account and fires the magic link server-side.
// On success this shows a confirmation state rather than redirecting,
// since the visitor has no session yet at this point.

"use client";

import { useState } from "react";
import Link from "next/link";
import { submitInquiry } from "@/lib/api/submitInquiry";

export function InquiryForm({ cookId }: { cookId: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      cook_id: cookId,
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    try {
      await submitInquiry(payload);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong sending your inquiry."
      );
    }
  }

  if (status === "success") {
    return (
      <div className="border border-ocean/40 bg-ocean/5 p-6">
        <p className="font-display text-xl text-ocean">Inquiry sent</p>
        <p className="mt-2 text-ink/80">
          Check your email for a link to follow this conversation — no password needed, just
          click the link to open your inbox anytime.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-hairline p-6">
      <h2 className="font-display text-2xl">Get in touch</h2>
      <p className="text-sm text-ink/70">
        Meal Prep Market connects you directly with this cook — booking and payment happen
        between you and them.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="font-mono text-xs uppercase tracking-wide text-ink/70">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            className="border border-hairline bg-paper px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="font-mono text-xs uppercase tracking-wide text-ink/70">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="border border-hairline bg-paper px-3 py-2"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="font-mono text-xs uppercase tracking-wide text-ink/70">
          Phone (optional)
        </label>
        <input id="phone" name="phone" className="border border-hairline bg-paper px-3 py-2" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="message" className="font-mono text-xs uppercase tracking-wide text-ink/70">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={4}
          placeholder="Tell them about your household, dietary needs, and how many meals a week you're after."
          className="border border-hairline bg-paper px-3 py-2"
        />
      </div>

      {status === "error" && (
        <p role="alert" className="font-mono text-sm text-paprika">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="bg-paprika px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "submitting" ? "Sending…" : "Send inquiry"}
      </button>

      <p className="font-mono text-[11px] text-ink/50">
        By submitting this inquiry, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-ink">
          Terms of Service
        </Link>{" "}
        and acknowledge that Meal Prep Market is an advertising directory platform.
      </p>
    </form>
  );
}
