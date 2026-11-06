// components/cook-dashboard/ShareReview.tsx
//
// "Share" for one review: draws a square black-and-gold picture of the
// review (stars, quote, reviewer, the cook's name, the Meal Prep Market
// logo and web address) in the browser, then lets the cook share it to
// Instagram / Facebook / WhatsApp through the phone's share menu, save
// it, or share the link to their page. Nothing is uploaded anywhere.

"use client";

import { useState } from "react";
import type { Review } from "@/lib/types/database";

const SIZE = 1080;
const BLACK = "#0E0D0B";
const GOLD = "#D4AF63";
const CREAM = "#F5EFE3";
const PIN = "M60 6 C33 6 14 26 14 52 C14 86 60 136 60 136 C60 136 106 86 106 52 C106 26 87 6 60 6 Z";
const BOWL = "M36 54 H84 A24 24 0 0 1 36 54 Z";
const STEAM = ["M50 44 C46 38 54 34 50 27", "M60 44 C56 38 64 34 60 27", "M70 44 C66 38 74 34 70 27"];

// The site's display font (Fraunces, loaded by next/font under a hashed name).
function displayFont(): string {
  const probe = document.createElement("span");
  probe.className = "font-display";
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily || "Georgia, serif";
  probe.remove();
  return family;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

async function drawReview(review: Review, businessName: string): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const font = displayFont();
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, SIZE - 80, SIZE - 80);

  // Logo: pin + bowl + steam, then the name.
  ctx.save();
  ctx.translate(SIZE / 2 - 42, 96);
  ctx.scale(0.7, 0.7);
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = GOLD;
  ctx.stroke(new Path2D(PIN));
  ctx.fillStyle = GOLD;
  ctx.fill(new Path2D(BOWL));
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(30, 54);
  ctx.lineTo(90, 54);
  ctx.stroke();
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 4.5;
  STEAM.forEach((d) => ctx.stroke(new Path2D(d)));
  ctx.restore();

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `600 44px ${font}`;
  const left = "Meal Prep ";
  const leftW = ctx.measureText(left).width;
  ctx.font = `italic 600 44px ${font}`;
  const rightW = ctx.measureText("Market").width;
  const startX = SIZE / 2 - (leftW + rightW) / 2;
  ctx.font = `600 44px ${font}`;
  ctx.fillStyle = CREAM;
  ctx.fillText(left, startX, 250);
  ctx.font = `italic 600 44px ${font}`;
  ctx.fillStyle = GOLD;
  ctx.fillText("Market", startX + leftW, 250);
  ctx.textAlign = "center";

  // The review block, centred between the header and the footer.
  const text = review.review_text?.trim() || "";
  const quoteSize = text.length > 140 ? 44 : text.length > 70 ? 50 : 58;
  const lineHeight = Math.round(quoteSize * 1.3);
  ctx.font = `italic 600 ${quoteSize}px ${font}`;
  const lines = text ? wrapLines(ctx, `“${text}”`, SIZE - 240, 6) : [];

  const starsH = 70;
  const gap1 = lines.length ? 56 : 0;
  const quoteH = lines.length ? lineHeight * lines.length : 0;
  const gap2 = 50;
  const nameH = 34;
  const gap3 = 34;
  const cookH = 40;
  const total = starsH + gap1 + quoteH + gap2 + nameH + gap3 + cookH;
  const areaTop = 300;
  const areaBottom = 930;
  let y = areaTop + (areaBottom - areaTop - total) / 2;

  ctx.font = `70px ${font}`;
  ctx.fillStyle = GOLD;
  ctx.fillText("★".repeat(review.rating) + "☆".repeat(5 - review.rating), SIZE / 2, y + starsH - 8);
  y += starsH + gap1;

  ctx.font = `italic 600 ${quoteSize}px ${font}`;
  ctx.fillStyle = CREAM;
  lines.forEach((line, i) => ctx.fillText(line, SIZE / 2, y + (i + 1) * lineHeight - lineHeight * 0.25));
  y += quoteH + gap2;

  ctx.font = `600 34px ${font}`;
  ctx.fillStyle = "rgba(245,239,227,0.75)";
  ctx.fillText(`— ${review.reviewer_name || "A happy customer"}`, SIZE / 2, y + nameH - 6);
  y += nameH + gap3;

  ctx.font = `600 40px ${font}`;
  ctx.fillStyle = GOLD;
  ctx.fillText(`Review for ${businessName}`, SIZE / 2, y + cookH - 6, SIZE - 200);

  // Footer.
  ctx.font = `26px ui-monospace, Menlo, monospace`;
  ctx.fillStyle = "rgba(245,239,227,0.7)";
  ctx.fillText("FIND LOCAL MEAL PREP COOKS · MEALPREPMARKET.COM.AU", SIZE / 2, 990, SIZE - 140);

  return canvas;
}

export function ShareReview({ review, cookId, businessName }: { review: Review; cookId: string; businessName: string }) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [canShareFile, setCanShareFile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [problem, setProblem] = useState(false);

  const pageUrl = `https://mealprepmarket.com.au/cooks/${cookId}#reviews`;
  const shareText = `${"⭐".repeat(review.rating)} ${review.review_text ? `“${review.review_text.trim()}”` : ""}${
    review.reviewer_name ? ` — ${review.reviewer_name}` : ""
  }\nOrder from ${businessName} on Meal Prep Market:`;

  async function openPanel() {
    setOpen(true);
    if (imageUrl) return;
    try {
      const canvas = await drawReview(review, businessName);
      setImageUrl(canvas.toDataURL("image/png"));
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (blob) {
        const f = new File([blob], "meal-prep-market-review.png", { type: "image/png" });
        setFile(f);
        setCanShareFile(typeof navigator.canShare === "function" && navigator.canShare({ files: [f] }));
      }
    } catch {
      setProblem(true);
    }
  }

  async function sharePicture() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], text: `${shareText} ${pageUrl}` });
    } catch {
      // Closed the share menu.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${shareText} ${pageUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this:", `${shareText} ${pageUrl}`);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openPanel}
        className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
      >
        Share this review
      </button>
    );
  }

  return (
    <div className="mt-2 w-full space-y-3 rounded-xl border border-hairline bg-paper p-4">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="Your review as a picture to share" className="mx-auto w-full max-w-xs rounded-lg" />
      ) : (
        <p className="text-sm text-ink/60">{problem ? "Couldn't make the picture on this device." : "Making your picture…"}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {canShareFile && (
          <button
            type="button"
            onClick={sharePicture}
            className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Share picture (Instagram, Facebook…)
          </button>
        )}
        {imageUrl && (
          <a
            href={imageUrl}
            download="meal-prep-market-review.png"
            className="rounded-full border border-gold px-4 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-paper"
          >
            Save picture
          </a>
        )}
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-hairline px-4 py-2 text-sm text-ink transition-colors hover:border-ink"
        >
          Facebook
        </a>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${pageUrl}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-hairline px-4 py-2 text-sm text-ink transition-colors hover:border-ink"
        >
          WhatsApp
        </a>
        <button
          type="button"
          onClick={copyLink}
          className="rounded-full border border-hairline px-4 py-2 text-sm text-ink transition-colors hover:border-ink"
        >
          {copied ? "Copied!" : "Copy text and link"}
        </button>
      </div>
      <p className="text-xs text-ink/50">
        For Instagram: tap <span className="text-ink/70">Share picture</span> and pick Instagram, or{" "}
        <span className="text-ink/70">Save picture</span> and post it from your photos.
      </p>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-ink/60 underline">
        Close
      </button>
    </div>
  );
}
