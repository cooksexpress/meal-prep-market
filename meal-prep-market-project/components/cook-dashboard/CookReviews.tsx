// components/cook-dashboard/CookReviews.tsx
//
// The cook's list of reviews, each with a reply box (cm_reply_to_review,
// migration 018) and a Share button (ShareReview).

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { callRpc } from "@/lib/stats/rpc";
import { StarRating } from "@/components/shared/StarRating";
import { ShareReview } from "@/components/cook-dashboard/ShareReview";
import type { Review } from "@/lib/types/database";

interface CookReviewsProps {
  cookId: string;
  businessName: string;
  initialReviews: Review[];
}

function ReviewItem({ review, cookId, businessName }: { review: Review; cookId: string; businessName: string }) {
  const [reply, setReply] = useState(review.cook_reply ?? "");
  const [saved, setSaved] = useState(review.cook_reply ?? "");
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function save(text: string) {
    setStatus("saving");
    const { error } = await callRpc(createClient(), "cm_reply_to_review", {
      p_review_id: review.id,
      p_reply: text,
    });
    if (error) {
      setStatus("error");
      return;
    }
    setSaved(text.trim());
    setReply(text.trim());
    setEditing(false);
    setStatus("idle");
  }

  return (
    <li className="rounded-2xl border border-hairline bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <StarRating rating={review.rating} size="sm" />
        {review.reviewer_name && <span className="font-medium">{review.reviewer_name}</span>}
        <span className="font-mono text-xs text-ink/50">
          {new Date(review.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
      {review.review_text && <p className="mt-2 whitespace-pre-line text-ink/85">{review.review_text}</p>}

      {saved && !editing ? (
        <div className="mt-4 rounded-xl border-l-2 border-gold bg-paper px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-wide text-gold">Your reply</p>
          <p className="mt-1 whitespace-pre-line text-sm text-ink/80">{saved}</p>
          <div className="mt-2 flex gap-4 text-sm">
            <button type="button" onClick={() => setEditing(true)} className="text-gold underline">
              Edit
            </button>
            <button
              type="button"
              onClick={() => save("")}
              disabled={status === "saving"}
              className="text-ink/60 underline disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : editing || !saved ? (
        editing ? (
          <div className="mt-4 space-y-2">
            <label htmlFor={`reply-${review.id}`} className="font-mono text-xs uppercase tracking-wide text-ink/70">
              Your reply (shows on your page)
            </label>
            <textarea
              id={`reply-${review.id}`}
              value={reply}
              maxLength={500}
              rows={3}
              onChange={(e) => setReply(e.target.value)}
              placeholder={`Thank you${review.reviewer_name ? ` ${review.reviewer_name}` : ""}! So glad you enjoyed it.`}
              className="w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => save(reply)}
                disabled={status === "saving" || !reply.trim()}
                className="rounded-full bg-gold px-5 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {status === "saving" ? "Saving…" : "Post reply"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setReply(saved);
                }}
                className="text-sm text-ink/60 underline"
              >
                Cancel
              </button>
              <span className="text-xs text-ink/40">{reply.length}/500</span>
            </div>
          </div>
        ) : null
      ) : null}

      {status === "error" && (
        <p role="alert" className="mt-2 font-mono text-sm text-paprika">
          Couldn&rsquo;t save your reply. Please try again.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!saved && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full border border-gold px-4 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-paper"
          >
            Reply
          </button>
        )}
        <ShareReview review={review} cookId={cookId} businessName={businessName} />
      </div>
    </li>
  );
}

export function CookReviews({ cookId, businessName, initialReviews }: CookReviewsProps) {
  if (initialReviews.length === 0) {
    return (
      <div className="rounded-2xl border border-hairline bg-surface p-6 text-ink/70">
        No reviews yet. Use <span className="text-ink">Ask for a review</span> on your Overview page to
        send your regulars a link.
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {initialReviews.map((review) => (
        <ReviewItem key={review.id} review={review} cookId={cookId} businessName={businessName} />
      ))}
    </ul>
  );
}
