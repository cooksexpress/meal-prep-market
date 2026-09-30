// components/admin/CookModerationList.tsx

"use client";

import { useState, useTransition } from "react";
import { deactivateCook, reactivateCook } from "@/app/admin/actions";

interface CookRow {
  id: string;
  business_name: string;
  is_active: boolean;
}

export function CookModerationList({ cooks }: { cooks: CookRow[] }) {
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = cooks.filter((c) =>
    c.business_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input
        type="search"
        placeholder="Search cooks by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-hairline bg-paper px-3 py-2 font-mono text-sm"
      />

      <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
        {filtered.map((cook) => (
          <li key={cook.id} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="font-medium">{cook.business_name}</p>
              <p className={`font-mono text-xs ${cook.is_active ? "text-ocean" : "text-paprika"}`}>
                {cook.is_active ? "Live" : "Hidden"}
              </p>
            </div>
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  if (cook.is_active) {
                    await deactivateCook(cook.id);
                  } else {
                    await reactivateCook(cook.id);
                  }
                })
              }
              className="font-mono text-xs text-paprika underline disabled:opacity-50"
            >
              {cook.is_active ? "Deactivate listing" : "Reactivate listing"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
