// components/cook-dashboard/SubscriptionStatusCard.tsx
//
// Shows where the cook's listing stands. Most cooks are on a free
// listing (status "free", migration 011): no card, no time limit.

import Link from "next/link";

export type SubscriptionStatus =
  | "free"
  | "trialing"
  | "active"
  | "past_due"
  | "grace_period"
  | "canceled"
  | "delisted";

interface SubscriptionStatusCardProps {
  status: SubscriptionStatus | null;
  trialEndAt: string | null;
  gracePeriodEndsAt: string | null;
  // True once the cook has subscribed through Stripe (card on file).
  hasSubscription: boolean;
  // Show a "Subscribe" link to the Billing page (the overview page does;
  // the Billing page shows its own button instead).
  showSubscribeLink?: boolean;
}

function daysUntil(dateStr: string): number {
  const diffMs = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SubscriptionStatusCard({
  status,
  trialEndAt,
  gracePeriodEndsAt,
  hasSubscription,
  showSubscribeLink = false,
}: SubscriptionStatusCardProps) {
  if (!status) {
    return (
      <div className="rounded-2xl border border-hairline p-6">
        <p className="font-display text-xl">Your listing isn&rsquo;t live yet</p>
        <p className="mt-1 text-ink/70">Finish signing up to put your listing live.</p>
        <Link
          href="/onboarding/billing"
          className="mt-4 inline-block rounded-full bg-gold px-5 py-2 text-sm font-medium text-paper"
        >
          Put my listing live
        </Link>
      </div>
    );
  }

  let label: string;
  let detail: string;
  let tone: "good" | "warn" | "bad";
  let offerSubscribe = false;

  switch (status) {
    case "free":
      label = "Free listing";
      detail = "Your listing is live and free. No card needed.";
      tone = "good";
      break;
    case "trialing": {
      const days = trialEndAt ? daysUntil(trialEndAt) : null;
      label = days !== null ? `Free trial: ${days} ${days === 1 ? "day" : "days"} left` : "Free trial";
      if (hasSubscription) {
        detail = trialEndAt
          ? `You're subscribed. Your first payment is on ${formatDate(trialEndAt)}.`
          : "You're subscribed. No charge until your trial ends.";
        tone = "good";
      } else {
        detail = trialEndAt
          ? `Subscribe any time before ${formatDate(trialEndAt)} to stay listed. You won't be charged until your trial ends.`
          : "Subscribe any time to stay listed after your trial.";
        tone = days !== null && days <= 7 ? "warn" : "good";
        offerSubscribe = true;
      }
      break;
    }
    case "active":
      label = "Active";
      detail = "Your listing is live and your subscription is in good standing.";
      tone = "good";
      break;
    case "past_due":
    case "grace_period":
      label = "Payment issue";
      detail = gracePeriodEndsAt
        ? `Please update your card within ${daysUntil(gracePeriodEndsAt)} days or your listing will be hidden.`
        : "Please update your payment details as soon as possible.";
      tone = "bad";
      break;
    case "canceled":
      label = "Subscription ended";
      detail = "Your listing is hidden. Subscribe to go live again. Your menu and photos are saved.";
      tone = "bad";
      offerSubscribe = true;
      break;
    case "delisted":
    default:
      label = "Listing hidden";
      detail = "Your listing isn't visible right now. Subscribe to go live again. Your menu and photos are saved.";
      tone = "bad";
      offerSubscribe = true;
      break;
  }

  const toneClasses = {
    good: "border-gold/40 bg-gold/5",
    warn: "border-gold bg-gold/10",
    bad: "border-paprika/50 bg-paprika/5",
  }[tone];

  return (
    <div className={`rounded-2xl border p-6 ${toneClasses}`}>
      <p className={`font-display text-xl ${tone === "bad" ? "text-paprika" : "text-gold"}`}>{label}</p>
      <p className="mt-1 text-ink/80">{detail}</p>
      {offerSubscribe && showSubscribeLink && (
        <Link
          href="/cook-dashboard/billing"
          className="mt-4 inline-block rounded-full bg-gold px-5 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Subscribe
        </Link>
      )}
    </div>
  );
}
