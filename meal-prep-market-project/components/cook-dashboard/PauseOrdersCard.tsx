// components/cook-dashboard/PauseOrdersCard.tsx
//
// "Pause orders": the cook stops taking orders and messages for a while,
// for any reason. Optional "back on" date: the listing reopens by
// itself that day. The listing stays visible with a note meanwhile.

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatBackDate, isOrdersPaused, todayOnGoldCoast } from "@/lib/cooks/availability";

interface PauseOrdersCardProps {
  cookId: string;
  initialPaused: boolean;
  initialPausedUntil: string | null;
}

export function PauseOrdersCard({ cookId, initialPaused, initialPausedUntil }: PauseOrdersCardProps) {
  const supabase = createClient();
  const [paused, setPaused] = useState(
    isOrdersPaused({ orders_paused: initialPaused, paused_until: initialPausedUntil })
  );
  const [pausedUntil, setPausedUntil] = useState<string | null>(initialPausedUntil);
  const [choosing, setChoosing] = useState(false);
  const [backDate, setBackDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tomorrow = (() => {
    const [y, m, d] = todayOnGoldCoast().split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  })();

  async function save(nextPaused: boolean, nextUntil: string | null) {
    setBusy(true);
    setErrorMessage(null);
    const { error } = await supabase
      .from("cm_cooks")
      .update({ orders_paused: nextPaused, paused_until: nextUntil })
      .eq("id", cookId);
    setBusy(false);

    if (error) {
      setErrorMessage("Couldn't save that. Please try again.");
      return;
    }
    setPaused(nextPaused);
    setPausedUntil(nextUntil);
    setChoosing(false);
    setBackDate("");
  }

  if (paused) {
    return (
      <section className="rounded-2xl border border-gold/50 bg-gold/5 p-5">
        <p className="font-mono text-xs uppercase tracking-wide text-gold">Orders paused</p>
        <p className="mt-2 text-ink/80">
          {pausedUntil
            ? `Your listing shows "Not taking orders right now · Back ${formatBackDate(pausedUntil)}". It opens again by itself on ${formatBackDate(pausedUntil)}.`
            : `Your listing shows "Not taking orders right now". Clients can't order or send messages until you resume.`}
        </p>
        <button
          type="button"
          onClick={() => save(false, null)}
          disabled={busy}
          className="mt-4 rounded-full bg-gold px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Resume orders"}
        </button>
        {errorMessage && (
          <p role="alert" className="mt-2 font-mono text-sm text-paprika">
            {errorMessage}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5">
      <p className="font-mono text-xs uppercase tracking-wide text-ink/60">Taking orders</p>
      <p className="mt-2 text-ink/80">
        Need a break? Pause orders and clients won&rsquo;t be able to order or message you until
        you&rsquo;re back. Your listing stays up.
      </p>

      {!choosing ? (
        <button
          type="button"
          onClick={() => setChoosing(true)}
          className="mt-4 rounded-full border border-gold px-6 py-3 text-gold transition-colors hover:bg-gold hover:text-paper"
        >
          Pause orders
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="back-date" className="font-mono text-xs uppercase tracking-wide text-ink/70">
              Back on (optional)
            </label>
            <input
              id="back-date"
              type="date"
              min={tomorrow}
              value={backDate}
              onChange={(e) => setBackDate(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-hairline bg-paper px-3 py-3"
            />
            <p className="text-sm text-ink/50">
              Pick a date and your listing opens again by itself. Leave it empty to resume yourself.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => save(true, backDate || null)}
              disabled={busy}
              className="rounded-full bg-gold px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Pause orders"}
            </button>
            <button
              type="button"
              onClick={() => {
                setChoosing(false);
                setBackDate("");
              }}
              className="text-sm text-ink/60 underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <p role="alert" className="mt-2 font-mono text-sm text-paprika">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
