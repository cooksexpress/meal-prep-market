// components/cook-dashboard/ShareListing.tsx
//
// One tap to send their listing to customers: the phone's own share
// menu (WhatsApp, Instagram, Messages...), plus WhatsApp and Copy link
// buttons for computers and older phones.

"use client";

import { useEffect, useState } from "react";

interface ShareListingProps {
  cookId: string;
  businessName: string;
}

export function ShareListing({ cookId, businessName }: ShareListingProps) {
  const [url, setUrl] = useState(`https://mealprepmarket.com.au/cooks/${cookId}`);
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reviewCopied, setReviewCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/cooks/${cookId}`);
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, [cookId]);

  const message = `Order your weekly meal prep from ${businessName} on Meal Prep Market:`;

  async function share() {
    try {
      await navigator.share({ title: businessName, text: message, url });
    } catch {
      // They closed the share menu. Nothing to do.
    }
  }

  const reviewMessage = `Hi! Would you mind leaving ${businessName} a quick review? It only takes a minute and really helps: ${url}#reviews`;

  async function copyReview() {
    try {
      await navigator.clipboard.writeText(reviewMessage);
      setReviewCopied(true);
      setTimeout(() => setReviewCopied(false), 2500);
    } catch {
      window.prompt("Copy this message:", reviewMessage);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy your listing link:", url);
    }
  }

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5">
      <h2 className="font-display text-xl">Share your listing</h2>
      <p className="mt-1 text-sm text-ink/60">
        Send it to your customers, or post it on Instagram or Facebook so they can order from you here.
      </p>
      <p className="mt-3 break-all rounded-lg border border-hairline bg-paper px-3 py-2 font-mono text-xs text-ink/70">
        {url}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {canShare && (
          <button
            type="button"
            onClick={share}
            className="rounded-full bg-gold px-5 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Share
          </button>
        )}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-gold px-5 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-paper"
        >
          WhatsApp
        </a>
        <button
          type="button"
          onClick={copy}
          className="rounded-full border border-hairline px-5 py-2 text-sm text-ink transition-colors hover:border-ink"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>

      <div className="mt-6 border-t border-hairline pt-5">
        <h3 className="font-medium">Ask for a review</h3>
        <p className="mt-1 text-sm text-ink/60">
          Reviews help new customers choose you. Send this to happy customers, friends and family.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(reviewMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-gold px-5 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-paper"
          >
            Send on WhatsApp
          </a>
          <button
            type="button"
            onClick={copyReview}
            className="rounded-full border border-hairline px-5 py-2 text-sm text-ink transition-colors hover:border-ink"
          >
            {reviewCopied ? "Copied!" : "Copy message"}
          </button>
        </div>
      </div>
    </section>
  );
}
