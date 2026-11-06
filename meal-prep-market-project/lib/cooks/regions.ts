// lib/cooks/regions.ts
//
// Where a cook is based (cm_cooks.region, migrations 013 and 019).
// Cooks pick their state, then a city or area in it. The stored value is
// the area's label, which is unique across Australia.
//
// Customers see a city's button on the homepage only once that city has
// AREA_BUTTON_MIN live cooks, so nobody lands on an empty city.

export const STATES = [
  { code: "QLD", name: "Queensland", areas: ["Gold Coast", "Brisbane", "Sunshine Coast", "Other Queensland"] },
  { code: "NSW", name: "New South Wales", areas: ["Sydney", "Central Coast", "Newcastle", "Wollongong", "Other NSW"] },
  { code: "VIC", name: "Victoria", areas: ["Melbourne", "Geelong", "Other Victoria"] },
  { code: "WA", name: "Western Australia", areas: ["Perth", "Other WA"] },
  { code: "SA", name: "South Australia", areas: ["Adelaide", "Other SA"] },
  { code: "TAS", name: "Tasmania", areas: ["Hobart", "Other Tasmania"] },
  { code: "ACT", name: "ACT", areas: ["Canberra"] },
  { code: "NT", name: "Northern Territory", areas: ["Darwin", "Other NT"] },
] as const;

export const REGIONS: readonly string[] = STATES.flatMap((s) => s.areas as readonly string[]);

export function stateOfRegion(region: string | null | undefined): string | null {
  if (!region) return null;
  return STATES.find((s) => (s.areas as readonly string[]).includes(region))?.code ?? null;
}

// How many live cooks a city needs before customers get a button for it.
export const AREA_BUTTON_MIN = 5;
