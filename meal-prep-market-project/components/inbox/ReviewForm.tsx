// components/inbox/ReviewForm.tsx
//
// Direct insert into cm_reviews from the authenticated client — no
// Edge Function needed here, since RLS policy cm_reviews_insert
// already enforces "must have a real inquiry with this cook" and
// "one review per client per cook" is enforced by a unique constraint.
// This component only handles the UI/UX; eligibility is enforced by
// the database either way.

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StarRating } from "@/components/shared/StarRating";

interface ReviewFormProps {
  cookId: string;
  clientId: string;
  inquiryId: string;
  onSubmitted?: () => void;
}

export function ReviewForm({ cookId, clientId, inquiryId, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (rating === 0) {
      setErrorMessage("Please select a star rating.");
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.from("cm_reviews").insert({
      cook_id: cookId,
      client_id: clientId,
      inquiry_id: inquiryId,
      rating,
      review_text: reviewText.trim() || null,
    });

    if (error) {
      setStatus("error");
      // Unique constraint violation reads as a confusing Postgres error
      // by default — give a plain-language message instead.
      setErrorMessage(
        error.code === "23505"
          ? "You've already reviewed this cook."
          : "Couldn't submit your review. Please try again."
      );
      return;
    }

    setStatus("success");
    onSubmitted?.();
  }

  if (status === "success") {
    return (
      <div className="border border-ocean/40 bg-ocean/5 p-6">
        <p className="font-display text-xl text-ocean">Thanks for your review</p>
        <p className="mt-2 text-ink/80">It&rsquo;s now visible on this cook&rsquo;s public profile.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-hairline p-6">
      <h3 className="font-display text-xl">Leave a review</h3>

      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-wide text-ink/70">Rating</p>
        <StarRating rating={rating} onChange={setRating} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="review_text" className="font-mono text-xs uppercase tracking-wide text-ink/70">
          Your review (optional)
        </label>
        <textarea
          id="review_text"
          rows={3}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          className="border border-hairline bg-paper px-3 py-2"
        />
      </div>

      {errorMessage && (
        <p role="alert" className="font-mono text-sm text-paprika">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="bg-ocean px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
