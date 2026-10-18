// components/cook-profile/AvailabilityInfo.tsx
//
// On a cook's listing: the "Not taking orders right now" note when
// they've paused orders, then how it works (delivery / pickup, days,
// fee, order cut-off) and their opening hours.

import { DAYS, formatBackDate, formatTime, summarizeHours } from "@/lib/cooks/availability";
import type { Cook } from "@/lib/types/database";

interface AvailabilityInfoProps {
  cook: Pick<
    Cook,
    | "tier"
    | "paused_until"
    | "opening_hours"
    | "delivery_method"
    | "delivery_areas"
    | "delivery_days"
    | "delivery_fee"
    | "pickup_area"
    | "order_cutoff_day"
    | "order_cutoff_time"
  >;
  paused: boolean;
}

function dayList(keys: string[]): string {
  const names = DAYS.filter((d) => keys.includes(d.key)).map((d) => d.long);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function AvailabilityInfo({ cook, paused }: AvailabilityInfoProps) {
  const inHome = cook.tier === "tier_1_in_home";
  const method = inHome ? "delivery" : cook.delivery_method;
  const delivers = method === "delivery" || method === "both";
  const picksUp = method === "pickup" || method === "both";
  const days = dayList(cook.delivery_days ?? []);
  const fee = cook.delivery_fee === null ? null : Number(cook.delivery_fee);
  const cutoffDay = DAYS.find((d) => d.key === cook.order_cutoff_day);

  const details: { label: string; value: string }[] = [];
  if (delivers && cook.delivery_areas) {
    details.push({ label: inHome ? "Travels to" : "Delivers to", value: cook.delivery_areas });
  } else if (method === "delivery" || method === "both") {
    details.push({ label: inHome ? "Cooks at" : "Delivery", value: inHome ? "Your home" : "Available" });
  }
  if (picksUp) {
    details.push({ label: "Pickup", value: cook.pickup_area ? `From ${cook.pickup_area}` : "Available" });
  }
  if (days) {
    details.push({
      label: inHome ? "Available" : picksUp && !delivers ? "Pickup days" : "Delivery days",
      value: days,
    });
  }
  if (delivers && fee !== null) {
    details.push({
      label: inHome ? "Travel fee" : "Delivery fee",
      value: fee === 0 ? "Free" : `$${Number.isInteger(fee) ? fee : fee.toFixed(2)}`,
    });
  }
  if (cutoffDay) {
    details.push({
      label: inHome ? "Book by" : "Order by",
      value: `${cutoffDay.long}${cook.order_cutoff_time ? ` ${formatTime(cook.order_cutoff_time)}` : ""}${
        inHome ? "" : " for the coming week"
      }`,
    });
  }

  const hours = summarizeHours(cook.opening_hours);
  if (!paused && details.length === 0 && hours.length === 0) return null;

  return (
    <section className="space-y-6 border-b border-hairline py-8">
      {paused && (
        <div className="rounded-2xl border border-gold/50 bg-gold/5 p-4">
          <p className="font-medium text-gold">
            Not taking orders right now
            {cook.paused_until ? ` · Back ${formatBackDate(cook.paused_until)}` : ""}
          </p>
          <p className="mt-1 text-sm text-ink/70">
            You can still look through the menu. Ordering and messages will open again when they&rsquo;re back.
          </p>
        </div>
      )}

      {(details.length > 0 || hours.length > 0) && (
        <div className="grid gap-6 sm:grid-cols-2">
          {details.length > 0 && (
            <div>
              <h2 className="font-mono text-xs uppercase tracking-wide text-ink/60">How it works</h2>
              <dl className="mt-2 space-y-2">
                {details.map((row) => (
                  <div key={row.label} className="flex gap-4">
                    <dt className="w-28 shrink-0 text-ink/60">{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {hours.length > 0 && (
            <div>
              <h2 className="font-mono text-xs uppercase tracking-wide text-ink/60">Opening hours</h2>
              <dl className="mt-2 space-y-2">
                {hours.map((row) => (
                  <div key={row.days} className="flex gap-4">
                    <dt className="w-28 shrink-0 text-ink/60">{row.days}</dt>
                    <dd>{row.time}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
