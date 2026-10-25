// components/shared/RecordView.tsx
//
// Counts one visit to the homepage or a cook's page (migration 012).
// No cookies and no personal details: it only adds a row saying "the
// homepage" or "this cook's page" was opened. Refreshing the same page
// within 30 minutes doesn't count again.

"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { callRpc } from "@/lib/stats/rpc";

const WINDOW_MS = 30 * 60 * 1000;

export function RecordView({ kind, cookId }: { kind: "home" | "cook"; cookId?: string }) {
  useEffect(() => {
    const key = `mpm-view:${kind}:${cookId ?? ""}`;
    try {
      const last = Number(sessionStorage.getItem(key) ?? 0);
      if (Date.now() - last < WINDOW_MS) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      // Storage blocked (private mode): just count it.
    }
    callRpc(createClient(), "cm_record_view", { p_kind: kind, p_cook_id: cookId ?? null }).then(
      () => undefined,
      () => undefined
    );
  }, [kind, cookId]);

  return null;
}
