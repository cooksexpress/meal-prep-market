// components/cook-dashboard/SubscriptionStatusCard.tsx

interface SubscriptionStatusCardProps {
  status: "trialing" | "active" | "grace_period" | "canceled" | "delisted" | null;
  trialEndAt: string | null;
  gracePeriodEndsAt: string | null;
}

function daysUntil(dateStr: string): number {
  const diffMs = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function SubscriptionStatusCard({
  status,
  trialEndAt,
  gracePeriodEndsAt,
}: SubscriptionStatusCardProps) {
  if (!status) {
    return (
      <div className="border border-hairline p-6">
        <p className="font-display text-xl">No active subscription</p>
        <p className="mt-1 text-ink/70">Something looks off — please contact support.</p>
      </div>
    );
  }

  const CONFIG: Record<
    NonNullable<typeof status>,
    { label: string; tone: "ocean" | "butter" | "paprika"; detail: string }
  > = {
    trialing: {
      label: "Free trial",
      tone: "ocean",
      detail: trialEndAt
        ? `Ends in ${daysUntil(trialEndAt)} days — no charge until then.`
        : "Your trial is active.",
    },
    active: {
      label: "Active",
      tone: "ocean",
      detail: "Your listing is live and your subscription is in good standing.",
    },
    grace_period: {
      label: "Payment issue",
      tone: "paprika",
      detail: gracePeriodEndsAt
        ? `Please update your card within ${daysUntil(gracePeriodEndsAt)} days or your listing will be removed.`
        : "Please update your payment details as soon as possible.",
    },
    canceled: {
      label: "Canceled",
      tone: "paprika",
      detail: "Your subscription has been canceled and your listing is no longer visible.",
    },
    delisted: {
      label: "Delisted",
      tone: "paprika",
      detail: "Your listing was removed after payment issues went unresolved. Update billing to relist.",
    },
  };

  const { label, tone, detail } = CONFIG[status];
  const toneClasses = {
    ocean: "border-ocean/40 bg-ocean/5 text-ocean",
    butter: "border-butter/40 bg-butter/10 text-ink",
    paprika: "border-paprika/40 bg-paprika/5 text-paprika",
  }[tone];

  return (
    <div className={`border p-6 ${toneClasses}`}>
      <p className="font-display text-xl">{label}</p>
      <p className="mt-1 text-ink/80">{detail}</p>
    </div>
  );
}
