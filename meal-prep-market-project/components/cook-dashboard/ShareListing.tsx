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
    </section>
  );
}
