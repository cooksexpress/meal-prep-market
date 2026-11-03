// lib/cooks/regions.ts
//
// The areas a cook can be based in (cm_cooks.region, migration 013).

export const REGIONS = ["Gold Coast", "Brisbane", "Other Queensland"] as const;
export type Region = (typeof REGIONS)[number];
