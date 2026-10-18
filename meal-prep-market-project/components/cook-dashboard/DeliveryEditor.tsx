// components/cook-dashboard/DeliveryEditor.tsx
//
// How clients get their meals: delivery, pickup or both; the suburbs
// and days; any delivery fee; and the weekly order cut-off. In-home
// cooks (who cook at the client's place) get "areas you travel to"
// wording instead. Shown on the listing.

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DAYS } from "@/lib/cooks/availability";
import type { Cook, DayKey } from "@/lib/types/database";

export type DeliveryFields = Pick<
  Cook,
  | "tier"
  | "delivery_method"
  | "delivery_areas"
  | "delivery_days"
  | "delivery_fee"
  | "pickup_area"
  | "order_cutoff_day"
  | "order_cutoff_time"
>;

interface DeliveryEditorProps {
  cookId: string;
  initial: DeliveryFields;
}

const fieldClass = "w-full rounded-lg border border-hairline bg-paper px-3 py-3";
const labelClass = "font-mono text-xs uppercase tracking-wide text-ink/70";

export function DeliveryEditor({ cookId, initial }: DeliveryEditorProps) {
  const supabase = createClient();
  const inHome = initial.tier === "tier_1_in_home";

  const [method, setMethod] = useState<"delivery" | "pickup" | "both">(initial.delivery_method ?? "delivery");
  const [areas, setAreas] = useState(initial.delivery_areas ?? "");
  const [days, setDays] = useState<DayKey[]>(initial.delivery_days ?? []);
  const [fee, setFee] = useState(initial.delivery_fee === null ? "" : String(initial.delivery_fee));
  const [pickupArea, setPickupArea] = useState(initial.pickup_area ?? "");
  const [cutoffDay, setCutoffDay] = useState<DayKey | "">(initial.order_cutoff_day ?? "");
  const [cutoffTime, setCutoffTime] = useState(initial.order_cutoff_time ?? "18:00");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [problem, setProblem] = useState<string | null>(null);

  const delivers = inHome || method !== "pickup";
  const picksUp = !inHome && method !== "delivery";

  function toggleDay(day: DayKey) {
    setStatus("idle");
    setDays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : DAYS.map((d) => d.key).filter((k) => k === day || current.includes(k))
    );
  }

  async function handleSave() {
    const feeNumber = fee.trim() === "" ? null : Number(fee);
    if (feeNumber !== null && (Number.isNaN(feeNumber) || feeNumber < 0 || feeNumber > 500)) {
      setProblem("Check the fee: type a number, or 0 for free.");
      return;
    }

    setProblem(null);
    setStatus("saving");
    const { error } = await supabase
      .from("cm_cooks")
      .update({
        delivery_method: inHome ? null : method,
        delivery_areas: delivers ? areas.trim() || null : null,
        delivery_days: days,
        delivery_fee: delivers ? feeNumber : null,
        pickup_area: picksUp ? pickupArea.trim() || null : null,
        order_cutoff_day: cutoffDay || null,
        order_cutoff_time: cutoffDay ? cutoffTime || null : null,
      })
      .eq("id", cookId);
    setStatus(error ? "error" : "saved");
  }

  const changed = () => setStatus("idle");

  return (
    <div className="space-y-5">
      {!inHome && (
        <div className="flex flex-col gap-2">
          <span className={labelClass}>How clients get their meals</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["delivery", "I deliver"],
                ["pickup", "Pickup only"],
                ["both", "Both"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMethod(value);
                  changed();
                }}
                className={`rounded-full border px-4 py-2 text-sm ${
                  method === value ? "border-gold bg-gold text-paper" : "border-hairline text-ink/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {delivers && (
        <div className="flex flex-col gap-1">
          <label htmlFor="delivery-areas" className={labelClass}>
            {inHome ? "Areas you travel to" : "Suburbs you deliver to"}
          </label>
          <input
            id="delivery-areas"
            placeholder="e.g. Robina, Varsity Lakes, Burleigh Heads"
            value={areas}
            onChange={(e) => {
              setAreas(e.target.value);
              changed();
            }}
            className={fieldClass}
          />
        </div>
      )}

      {picksUp && (
        <div className="flex flex-col gap-1">
          <label htmlFor="pickup-area" className={labelClass}>
            Pickup suburb
          </label>
          <input
            id="pickup-area"
            placeholder="e.g. Robina"
            value={pickupArea}
            onChange={(e) => {
              setPickupArea(e.target.value);
              changed();
            }}
            className={fieldClass}
          />
          <p className="text-sm text-ink/50">
            Suburb only. You can share the exact address with clients after they order.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className={labelClass}>
          {inHome ? "Days you're available" : picksUp && !delivers ? "Pickup days" : "Delivery days"}
        </span>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <button
              key={day.key}
              type="button"
              onClick={() => toggleDay(day.key)}
              className={`w-14 rounded-full border py-2 text-sm ${
                days.includes(day.key) ? "border-gold bg-gold text-paper" : "border-hairline text-ink/80"
              }`}
            >
              {day.short}
            </button>
          ))}
        </div>
      </div>

      {delivers && (
        <div className="flex flex-col gap-1">
          <label htmlFor="delivery-fee" className={labelClass}>
            {inHome ? "Travel fee ($, optional)" : "Delivery fee ($, optional)"}
          </label>
          <input
            id="delivery-fee"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            placeholder="e.g. 10, or 0 for free"
            value={fee}
            onChange={(e) => {
              setFee(e.target.value);
              changed();
            }}
            className={`${fieldClass} max-w-xs`}
          />
          <p className="text-sm text-ink/50">Shown on your listing and added to the client&rsquo;s total when they pay online.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className={labelClass}>{inHome ? "Book by (optional)" : "Order cut-off (optional)"}</span>
        <p className="text-sm text-ink/50">
          The last day and time clients can order for the coming week, e.g. Thursday 6pm.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Cut-off day"
            value={cutoffDay}
            onChange={(e) => {
              setCutoffDay(e.target.value as DayKey | "");
              changed();
            }}
            className="rounded-lg border border-hairline bg-paper px-3 py-3"
          >
            <option value="">No cut-off</option>
            {DAYS.map((day) => (
              <option key={day.key} value={day.key}>
                {day.long}
              </option>
            ))}
          </select>
          {cutoffDay && (
            <input
              type="time"
              aria-label="Cut-off time"
              value={cutoffTime}
              onChange={(e) => {
                setCutoffTime(e.target.value);
                changed();
              }}
              className="rounded-lg border border-hairline bg-paper px-3 py-3"
            />
          )}
        </div>
      </div>

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
          {status === "saving" ? "Saving…" : "Save delivery details"}
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
