// components/cook-profile/LeaveReview.tsx
//
// Open reviews, like Google: stars, a few words and a first name. No
// sign-in or email. Only the first name is shown. The database limits
// spam (see migration 010) and admins can hide reviews.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface LeaveReviewProps {
  cookId: string;
  cookName: string;
}

const fieldClass = "w-full rounded-lg border border-hairline bg-paper px-3 py-3";
const labelClass = "font-mono text-xs uppercase tracking-wide text-ink/70";

export function LeaveReview({ cookId, cookName }: LeaveReviewProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [website, setWebsite] = useState(""); // hidden spam trap
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (website) return;
    if (rating < 1) {
      setMessage("Tap the stars to choose a rating.");
      return;
    }
    if (!name.trim()) {
      setMessage("Add your first name.");
      return;
    }

    setStatus("saving");
    setMessage(null);
    const { error } = await createClient()
      .from("cm_reviews")
      .insert({
        cook_id: cookId,
        rating,
        reviewer_name: name.trim().slice(0, 40),
        review_text: text.trim() ? text.trim().slice(0, 1000) : null,
      });

    if (error) {
      setStatus("error");
      setMessage(
        error.message.includes("already reviewed") || error.message.includes("Please try again")
          ? error.message
          : "We couldn't post your review just now. Please try again."
      );
      return;
    }

    setStatus("done");
    router.refresh();
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-gold/50 bg-gold/5 p-5">
        <p className="font-medium text-gold">Thank you for your review!</p>
        <p className="mt-1 text-sm text-ink/70">It&rsquo;s now on {cookName}&rsquo;s page.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-gold px-5 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-paper"
      >
        Leave a review
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-hairline bg-surface p-5">
      <p className="font-display text-xl">Review {cookName}</p>

      <div className="flex flex-col gap-2">
        <span className={labelClass}>Your rating</span>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} star${value > 1 ? "s" : ""}`}
              onClick={() => {
                setRating(value);
                setMessage(null);
              }}
              className={`h-11 w-11 text-3xl leading-none ${value <= rating ? "text-gold" : "text-hairline"}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="review-name" className={labelClass}>
          Your first name
        </label>
        <input
          id="review-name"
          maxLength={40}
          autoComplete="given-name"
          placeholder="e.g. Sarah"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setMessage(null);
          }}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="review-text" className={labelClass}>
          Your review (optional)
        </label>
        <textarea
          id="review-text"
          rows={3}
          maxLength={1000}
          placeholder="What did you love about the food?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="review-website">Website</label>
        <input
          id="review-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {message && (
        <p role="alert" className="font-mono text-sm text-paprika">
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-full bg-gold px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "saving" ? "Posting…" : "Post review"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-ink/60 underline">
          Cancel
        </button>
      </div>
      <p className="text-xs text-ink/50">Only your first name is shown.</p>
    </form>
  );
}
