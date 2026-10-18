// lib/cooks/availability.ts
//
// Helpers for "Pause orders" and opening hours. Dates use Gold Coast
// time (Australia/Brisbane, no daylight saving), the same as the
// database check in migration 008.

import type { DayKey, OpeningHours } from "@/lib/types/database";

export const DAYS: { key: DayKey; short: string; long: string }[] = [
  { key: "mon", short: "Mon", long: "Monday" },
  { key: "tue", short: "Tue", long: "Tuesday" },
  { key: "wed", short: "Wed", long: "Wednesday" },
  { key: "thu", short: "Thu", long: "Thursday" },
  { key: "fri", short: "Fri", long: "Friday" },
  { key: "sat", short: "Sat", long: "Saturday" },
  { key: "sun", short: "Sun", long: "Sunday" },
];

// Today's date on the Gold Coast, as "YYYY-MM-DD".
export function todayOnGoldCoast(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Brisbane" }).format(new Date());
}

// Paused right now? The listing reopens on the "back" date itself.
export function isOrdersPaused(cook: { orders_paused: boolean; paused_until: string | null }): boolean {
  if (!cook.orders_paused) return false;
  if (!cook.paused_until) return true;
  return cook.paused_until > todayOnGoldCoast();
}

// "2026-10-26" -> "Mon 26 Oct"
export function formatBackDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

// "08:00" -> "8am", "16:30" -> "4:30pm"
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

// Groups days with the same hours: "Mon–Fri", "8am–4pm"; "Sat", "9am–12pm".
export function summarizeHours(hours: OpeningHours | null): { days: string; time: string }[] {
  if (!hours) return [];
  const rows: { days: string; time: string }[] = [];
  let runStart: number | null = null;
  let runTime = "";

  const flush = (endIndex: number) => {
    if (runStart === null) return;
    const days =
      runStart === endIndex ? DAYS[runStart].short : `${DAYS[runStart].short}–${DAYS[endIndex].short}`;
    rows.push({ days, time: runTime });
    runStart = null;
  };

  DAYS.forEach((day, i) => {
    const slot = hours[day.key];
    const time = slot ? `${formatTime(slot.open)}–${formatTime(slot.close)}` : "";
    if (runStart !== null && time !== runTime) flush(i - 1);
    if (time && runStart === null) {
      runStart = i;
      runTime = time;
    }
  });
  flush(DAYS.length - 1);
  return rows;
}

// "From $12 a meal", worked out from the menu (migration 008 keeps
// price_range_min up to date). Whole dollars show without cents.
export function priceFromLabel(priceFrom: number | null): string {
  if (priceFrom === null || priceFrom === undefined || Number(priceFrom) <= 0) return "See menu for prices";
  const n = Number(priceFrom);
  return `From $${Number.isInteger(n) ? n : n.toFixed(2)} a meal`;
}
