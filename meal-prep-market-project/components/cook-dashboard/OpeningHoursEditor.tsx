// components/cook-dashboard/OpeningHoursEditor.tsx
//
// The days and hours a cook works. Shown on their listing so clients
// know when to expect a reply. Information only: clients can still
// send a message at any time.

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DAYS } from "@/lib/cooks/availability";
import type { DayKey, OpeningHours } from "@/lib/types/database";

interface OpeningHoursEditorProps {
  cookId: string;
  initialHours: OpeningHours | null;
}

const DEFAULT_SLOT = { open: "08:00", close: "16:00" };

export function OpeningHoursEditor({ cookId, initialHours }: OpeningHoursEditorProps) {
  const supabase = createClient();
  const [hours, setHours] = useState<OpeningHours>(initialHours ?? {});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [problem, setProblem] = useState<string | null>(null);

  function toggleDay(day: DayKey) {
    setStatus("idle");
    setHours((current) => {
      const next = { ...current };
      if (next[day]) {
        delete next[day];
      } else {
        // Copy the hours from the nearest open day before it, if any.
        const earlier = DAYS.slice(0, DAYS.findIndex((d) => d.key === day))
          .reverse()
          .find((d) => current[d.key]);
        next[day] = earlier ? { ...current[earlier.key]! } : { ...DEFAULT_SLOT };
      }
      return next;
    });
  }

  function setTime(day: DayKey, field: "open" | "close", value: string) {
    setStatus("idle");
    setHours((current) => ({ ...current, [day]: { ...current[day]!, [field]: value } }));
  }

  async function handleSave() {
    const badDay = DAYS.find((d) => {
      const slot = hours[d.key];
      return slot && (!slot.open || !slot.close || slot.close <= slot.open);
    });
    if (badDay) {
      setProblem(`Check ${badDay.long}: the closing time needs to be after the opening time.`);
      return;
    }

    setProblem(null);
    setStatus("saving");
    const cleaned = Object.keys(hours).length > 0 ? hours : null;
    const { error } = await supabase.from("cm_cooks").update({ opening_hours: cleaned }).eq("id", cookId);
    setStatus(error ? "error" : "saved");
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
        {DAYS.map((day) => {
          const slot = hours[day.key];
          return (
            <li key={day.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <label className="flex w-32 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(slot)}
                  onChange={() => toggleDay(day.key)}
                  className="h-5 w-5 accent-[#D4AF63]"
                />
                <span>{day.long}</span>
              </label>
              {slot ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label={`${day.long} opening time`}
                    value={slot.open}
                    onChange={(e) => setTime(day.key, "open", e.target.value)}
                    className="rounded-lg border border-hairline bg-paper px-2 py-2"
                  />
                  <span className="text-ink/50">to</span>
                  <input
                    type="time"
                    aria-label={`${day.long} closing time`}
                    value={slot.close}
                    onChange={(e) => setTime(day.key, "close", e.target.value)}
                    className="rounded-lg border border-hairline bg-paper px-2 py-2"
                  />
                </div>
              ) : (
                <span className="text-sm text-ink/40">Closed</span>
              )}
            </li>
          );
        })}
      </ul>

      {problem && (
        <p role="alert" className="font-mono text-sm text-paprika">
          {problem}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving"}
          className="rounded-full border border-gold px-5 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-paper disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save hours"}
        </button>
        {status === "saved" && <span className="text-sm text-gold">Saved</span>}
        {status === "error" && (
          <span role="alert" className="font-mono text-sm text-paprika">
            Couldn&rsquo;t save. Please try again.
          </span>
        )}
      </div>
    </div>
  );
}
