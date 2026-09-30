// components/onboarding/PackageManager.tsx

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Package } from "@/lib/types/database";

interface PackageManagerProps {
  cookId: string;
  initialPackages: Package[];
}

export function PackageManager({ cookId, initialPackages }: PackageManagerProps) {
  const supabase = createClient();
  const [packages, setPackages] = useState<Package[]>(initialPackages);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mealCount, setMealCount] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;

    setStatus("submitting");

    const { data, error } = await supabase
      .from("cm_packages")
      .insert({
        cook_id: cookId,
        name: name.trim(),
        description: description.trim() || null,
        meal_count: mealCount ? Number(mealCount) : null,
        indicative_price: price ? Number(price) : null,
        sort_order: packages.length,
      })
      .select()
      .single();

    if (error || !data) {
      setStatus("error");
      return;
    }

    setPackages((prev) => [...prev, data]);
    setName("");
    setDescription("");
    setMealCount("");
    setPrice("");
    setStatus("idle");
  }

  async function handleRemove(pkgId: string) {
    await supabase.from("cm_packages").delete().eq("id", pkgId);
    setPackages((prev) => prev.filter((p) => p.id !== pkgId));
  }

  return (
    <div className="space-y-6">
      {packages.length > 0 && (
        <ul className="divide-y divide-hairline border-y border-hairline">
          {packages.map((pkg) => (
            <li key={pkg.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{pkg.name}</p>
                {pkg.meal_count && (
                  <p className="font-mono text-xs text-ink/50">{pkg.meal_count} meals</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {pkg.indicative_price && (
                  <span className="font-mono text-sm text-ocean">~${pkg.indicative_price}</span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(pkg.id)}
                  className="font-mono text-xs text-paprika underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="space-y-3 border border-hairline p-4">
        <p className="font-mono text-xs uppercase tracking-wide text-ink/70">Add a package</p>
        <input
          placeholder="Package name — e.g. Standard Prep, 10 Meals"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-hairline bg-paper px-3 py-2"
        />
        <textarea
          placeholder="Short description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full border border-hairline bg-paper px-3 py-2"
        />
        <div className="flex gap-3">
          <input
            type="number"
            placeholder="Meal count"
            value={mealCount}
            onChange={(e) => setMealCount(e.target.value)}
            className="w-1/2 border border-hairline bg-paper px-3 py-2"
          />
          <input
            type="number"
            placeholder="Indicative price ($)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-1/2 border border-hairline bg-paper px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={status === "submitting" || !name.trim()}
          className="border border-ocean px-4 py-2 font-mono text-sm text-ocean transition-colors hover:bg-ocean hover:text-paper disabled:opacity-50"
        >
          {status === "submitting" ? "Adding…" : "Add package"}
        </button>
        {status === "error" && (
          <p role="alert" className="font-mono text-sm text-paprika">
            Couldn&rsquo;t add that package. Please try again.
          </p>
        )}
      </form>
    </div>
  );
}
