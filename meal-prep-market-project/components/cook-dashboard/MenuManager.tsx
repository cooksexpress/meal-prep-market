// components/cook-dashboard/MenuManager.tsx
//
// Dashboard Screen 2. Builds on cm_packages, now extended with
// dietary_tags and is_available for real orderable menu items rather
// than just informational sample packages.

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Package } from "@/lib/types/database";

interface MenuManagerProps {
  cookId: string;
  initialItems: Package[];
}

export function MenuManager({ cookId, initialItems }: MenuManagerProps) {
  const supabase = createClient();
  const [items, setItems] = useState<Package[]>(initialItems);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [dietaryTags, setDietaryTags] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");

  function parseTags(value: string): string[] {
    return value.split(",").map((t) => t.trim()).filter(Boolean);
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || !price) return;

    setStatus("submitting");

    const { data, error } = await supabase
      .from("cm_packages")
      .insert({
        cook_id: cookId,
        name: title.trim(),
        description: description.trim() || null,
        indicative_price: Number(price),
        dietary_tags: parseTags(dietaryTags),
        is_available: true,
        sort_order: items.length,
      })
      .select()
      .single();

    if (error || !data) {
      setStatus("error");
      return;
    }

    setItems((prev) => [...prev, data]);
    setTitle("");
    setDescription("");
    setPrice("");
    setDietaryTags("");
    setStatus("idle");
  }

  async function handleToggleAvailability(item: Package) {
    const nextValue = !item.is_available;
    // Optimistic update — instant toggle feel as requested.
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: nextValue } : i)));

    const { error } = await supabase
      .from("cm_packages")
      .update({ is_available: nextValue })
      .eq("id", item.id);

    if (error) {
      // Revert on failure.
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: !nextValue } : i)));
    }
  }

  async function handleRemove(itemId: string) {
    await supabase.from("cm_packages").delete().eq("id", itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  return (
    <div className="space-y-6">
      {items.length > 0 && (
        <ul className="divide-y divide-hairline border-y border-hairline">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium">{item.name}</p>
                {item.description && <p className="text-sm text-ink/70">{item.description}</p>}
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {item.dietary_tags.map((tag) => (
                    <span key={tag} className="border border-hairline px-2 py-0.5 font-mono text-[10px] text-ink/70">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {item.indicative_price != null && (
                  <span className="font-mono text-sm text-ocean">${item.indicative_price.toFixed(2)}</span>
                )}

                <button
                  type="button"
                  onClick={() => handleToggleAvailability(item)}
                  role="switch"
                  aria-checked={item.is_available}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    item.is_available ? "bg-ocean" : "bg-hairline"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper transition-transform ${
                      item.is_available ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className={`font-mono text-xs ${item.is_available ? "text-ocean" : "text-paprika"}`}>
                  {item.is_available ? "Available" : "Sold Out"}
                </span>

                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
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
        <p className="font-mono text-xs uppercase tracking-wide text-ink/70">Add a menu item</p>
        <input
          placeholder="Title — e.g. Chicken &amp; Greens Bowl"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-hairline bg-paper px-3 py-2"
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full border border-hairline bg-paper px-3 py-2"
        />
        <div className="flex gap-3">
          <input
            type="number"
            step="0.01"
            placeholder="Price ($)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-1/2 border border-hairline bg-paper px-3 py-2"
          />
          <input
            placeholder="Dietary tags — e.g. Gluten-Free, Nut-Free"
            value={dietaryTags}
            onChange={(e) => setDietaryTags(e.target.value)}
            className="w-1/2 border border-hairline bg-paper px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={status === "submitting" || !title.trim() || !price}
          className="border border-ocean px-4 py-2 font-mono text-sm text-ocean transition-colors hover:bg-ocean hover:text-paper disabled:opacity-50"
        >
          {status === "submitting" ? "Adding…" : "Add item"}
        </button>
        {status === "error" && (
          <p role="alert" className="font-mono text-sm text-paprika">
            Couldn&rsquo;t add that item. Please try again.
          </p>
        )}
      </form>
    </div>
  );
}
