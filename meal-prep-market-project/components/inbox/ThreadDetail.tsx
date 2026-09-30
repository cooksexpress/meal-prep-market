// components/inbox/ThreadDetail.tsx
//
// No in-app reply here by design — this is a lead-gen directory, not a
// chat product. The client's own message is shown for their records,
// and the cook's contact details are surfaced so they can continue the
// conversation directly (phone, email, or however the cook prefers).

import Link from "next/link";
import { TierBadge } from "@/components/shared/TierBadge";
import type { Cook } from "@/lib/types/database";

interface ThreadDetailProps {
  cook: Pick<Cook, "id" | "business_name" | "tier" | "profile_photo_url">;
  cookEmail: string | null;
  message: string;
  sentAt: string;
}

export function ThreadDetail({ cook, cookEmail, message, sentAt }: ThreadDetailProps) {
  return (
    <div className="space-y-8">
      <div className="border border-hairline p-6">
        <div className="flex items-center gap-3">
          <p className="font-display text-2xl">{cook.business_name}</p>
          <TierBadge tier={cook.tier} />
        </div>
        <Link href={`/cooks/${cook.id}`} className="mt-1 inline-block font-mono text-xs text-ocean underline">
          View full profile
        </Link>
      </div>

      <div>
        <p className="font-mono text-xs uppercase tracking-wide text-ink/70">Your message</p>
        <p className="mt-2 whitespace-pre-wrap text-ink/90">{message}</p>
        <p className="mt-2 font-mono text-xs text-ink/50">
          Sent{" "}
          {new Date(sentAt).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="border-t border-hairline pt-6">
        <p className="font-mono text-xs uppercase tracking-wide text-ink/70">
          Continue the conversation
        </p>
        <p className="mt-2 text-ink/80">
          Meal Prep Market doesn&rsquo;t host messaging beyond this inquiry — reach out to{" "}
          {cook.business_name} directly to arrange your booking and payment.
        </p>
        {cookEmail && (
          <a href={`mailto:${cookEmail}`} className="mt-3 inline-block font-mono text-sm text-ocean underline">
            {cookEmail}
          </a>
        )}
      </div>
    </div>
  );
}
