// lib/utils/formatCookName.ts
//
// "Eleni — Salt & Sage Kitchen" when a first name is set, otherwise
// just the business name (covers cooks who already fold their name
// into the business name itself, e.g. "Meals by John McDonald", so we
// don't double it up awkwardly).

import type { Cook } from "@/lib/types/database";

export function formatCookDisplayName(
  cook: Pick<Cook, "first_name" | "business_name">
): string {
  if (cook.first_name?.trim()) {
    return `${cook.first_name.trim()} — ${cook.business_name}`;
  }
  return cook.business_name;
}
