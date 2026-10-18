// components/menu/MenuEditor.tsx
//
// The one menu editor cooks use, both during sign-up and in their
// dashboard. A menu has two kinds of items:
//   - Single dish: one meal. Clients choose how many they want.
//   - Pack: a bundle of meals at a set price (e.g. 7-meal weekly pack).
// Cooks can also set a minimum number of meals per order.
// Everything is stored in cm_packages (item_type = 'dish' | 'pack').

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Package } from "@/lib/types/database";

interface MenuEditorProps {
  cookId: string;
  initialItems: Package[];
  initialMinOrderMeals: number | null;
  // Dashboard shows an Available / Sold out switch per item;
  // sign-up keeps it simple and hides it.
  showAvailability?: boolean;
}

type ItemType = "dish" | "pack";

const fieldClass = "w-full rounded-lg border border-hairline bg-paper px-3 py-2";
const labelClass = "font-mono text-xs uppercase tracking-wide text-ink/70";

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function formatPrice(value: number | null): string {
  return value == null ? "" : `$${value.toFixed(2)}`;
}

export function MenuEditor({
  cookId,
  initialItems,
  initialMinOrderMeals,
  showAvailability = false,
}: MenuEditorProps) {
  const supabase = createClient();
  const [items, setItems] = useState<Package[]>(initialItems);

  const [itemType, setItemType] = useState<ItemType>("dish");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [mealCount, setMealCount] = useState("");
  const [dietaryTags, setDietaryTags] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");

  const [minOrder, setMinOrder] = useState(initialMinOrderMeals?.toString() ?? "");
  const [minOrderStatus, setMinOrderStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const isPack = itemType === "pack";
  const priceNumber = Number(price);
  const mealCountNumber = Number(mealCount);
  const canSubmit =
    name.trim().length > 0 &&
    price !== "" &&
    priceNumber > 0 &&
    (!isPack || (Number.isInteger(mealCountNumber) && mealCountNumber >= 2));

  const dishes = items.filter((i) => i.item_type !== "pack");
  const packs = items.filter((i) => i.item_type === "pack");

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("submitting");

    const { data, error } = await supabase
      .from("cm_packages")
      .insert({
        cook_id: cookId,
        item_type: itemType,
        name: name.trim(),
        description: description.trim() || null,
        indicative_price: priceNumber,
        meal_count: isPack ? mealCountNumber : 1,
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
    setName("");
    setDescription("");
    setPrice("");
    setMealCount("");
    setDietaryTags("");
    setStatus("idle");
  }

  async function handleRemove(itemId: string) {
    await supabase.from("cm_packages").delete().eq("id", itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  async function handleToggleAvailability(item: Package) {
    const nextValue = !item.is_available;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: nextValue } : i)));

    const { error } = await supabase
      .from("cm_packages")
      .update({ is_available: nextValue })
      .eq("id", item.id);

    if (error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: !nextValue } : i)));
    }
  }

  async function handleSaveMinOrder() {
    const value = minOrder.trim() === "" ? null : Number(minOrder);
    if (value !== null && (!Number.isInteger(value) || value < 1 || value > 100)) {
      setMinOrderStatus("error");
      return;
    }

    setMinOrderStatus("saving");
    const { error } = await supabase
      .from("cm_cooks")
      .update({ min_order_meals: value })
      .eq("id", cookId);

    setMinOrderStatus(error ? "error" : "saved");
  }

  function renderItem(item: Package) {
    const itemIsPack = item.item_type === "pack";
    return (
      <li key={item.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{item.name}</p>
          {item.description && <p className="mt-0.5 text-sm text-ink/70">{item.description}</p>}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {itemIsPack && item.meal_count && (
              <span className="rounded-full border border-gold/60 px-2 py-0.5 font-mono text-[11px] text-gold">
                {item.meal_count} meals
              </span>
            )}
            {item.dietary_tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-hairline px-2 py-0.5 font-mono text-[11px] text-ink/70"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-mono text-sm text-gold">{formatPrice(item.indicative_price)}</span>

          {showAvailability && (
            <>
              <button
                type="button"
                onClick={() => handleToggleAvailability(item)}
                role="switch"
                aria-checked={item.is_available}
                aria-label={`${item.name} available`}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  item.is_available ? "bg-gold" : "bg-hairline"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper transition-transform ${
                    item.is_available ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className={`font-mono text-xs ${item.is_available ? "text-gold" : "text-paprika"}`}>
                {item.is_available ? "Available" : "Sold out"}
              </span>
            </>
          )}

          <button
            type="button"
            onClick={() => handleRemove(item.id)}
            className="font-mono text-xs text-paprika underline"
          >
            Remove
          </button>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-hairline bg-surface p-4 text-sm text-ink/70">
        <p>
          Add each thing clients can order, <span className="text-ink">one at a time</span>. You
          can add both:
        </p>
        <ul className="mt-2 space-y-1">
          <li>
            <span className="text-gold">Single dish</span>: one meal. Clients choose how many they
            want.
          </li>
          <li>
            <span className="text-gold">Pack</span>: a bundle of meals at a set price, like a
            7-meal weekly pack.
          </li>
        </ul>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink/50">Your menu is empty. Add your first dish below.</p>
      ) : (
        <div className="space-y-6">
          {dishes.length > 0 && (
            <div>
              <p className={labelClass}>Single dishes</p>
              <ul className="mt-2 divide-y divide-hairline border-y border-hairline">
                {dishes.map(renderItem)}
              </ul>
            </div>
          )}
          {packs.length > 0 && (
            <div>
              <p className={labelClass}>Packs</p>
              <ul className="mt-2 divide-y divide-hairline border-y border-hairline">
                {packs.map(renderItem)}
              </ul>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleAdd} className="space-y-4 rounded-2xl border border-hairline p-4">
        <div className="flex gap-2" role="radiogroup" aria-label="What are you adding?">
          {(["dish", "pack"] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={itemType === type}
              onClick={() => setItemType(type)}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                itemType === type
                  ? "bg-gold text-paper"
                  : "border border-hairline text-ink/70 hover:border-gold hover:text-gold"
              }`}
            >
              {type === "dish" ? "Add a single dish" : "Add a pack"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="menu-name" className={labelClass}>
            {isPack ? "Pack name" : "Dish name"}
          </label>
          <input
            id="menu-name"
            placeholder={isPack ? "7-meal weekly pack" : "Chicken & rice bowl"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="menu-description" className={labelClass}>
            What&rsquo;s included (optional)
          </label>
          <textarea
            id="menu-description"
            placeholder={
              isPack
                ? "One of each dish on this week's menu"
                : "Grilled chicken, brown rice, seasonal greens"
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={fieldClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="menu-price" className={labelClass}>
              {isPack ? "Pack price ($)" : "Price per meal ($)"}
            </label>
            <input
              id="menu-price"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder={isPack ? "89" : "14"}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={fieldClass}
            />
          </div>
          {isPack ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="menu-meals" className={labelClass}>
                Meals in pack
              </label>
              <input
                id="menu-meals"
                type="number"
                inputMode="numeric"
                step="1"
                min="2"
                placeholder="7"
                value={mealCount}
                onChange={(e) => setMealCount(e.target.value)}
                className={fieldClass}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label htmlFor="menu-tags" className={labelClass}>
                Dietary (optional)
              </label>
              <input
                id="menu-tags"
                placeholder="Gluten-free"
                value={dietaryTags}
                onChange={(e) => setDietaryTags(e.target.value)}
                className={fieldClass}
              />
            </div>
          )}
        </div>

        {isPack && (
          <div className="flex flex-col gap-1">
            <label htmlFor="menu-tags-pack" className={labelClass}>
              Dietary (optional)
            </label>
            <input
              id="menu-tags-pack"
              placeholder="High-protein, Dairy-free"
              value={dietaryTags}
              onChange={(e) => setDietaryTags(e.target.value)}
              className={fieldClass}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={status === "submitting" || !canSubmit}
          className="rounded-full border border-gold px-5 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-paper disabled:opacity-50"
        >
          {status === "submitting" ? "Adding…" : isPack ? "Add pack" : "Add dish"}
        </button>
        {status === "error" && (
          <p role="alert" className="font-mono text-sm text-paprika">
            Couldn&rsquo;t add that. Please try again.
          </p>
        )}
      </form>

      <div className="rounded-2xl border border-hairline p-4">
        <label htmlFor="min-order" className={labelClass}>
          Minimum order (optional)
        </label>
        <p className="mt-1 text-sm text-ink/60">
          The fewest meals a client can order from you. Leave empty for no minimum.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <input
            id="min-order"
            type="number"
            inputMode="numeric"
            step="1"
            min="1"
            max="100"
            placeholder="3"
            value={minOrder}
            onChange={(e) => {
              setMinOrder(e.target.value);
              setMinOrderStatus("idle");
            }}
            className="w-24 rounded-lg border border-hairline bg-paper px-3 py-2"
          />
          <span className="text-sm text-ink/60">meals</span>
          <button
            type="button"
            onClick={handleSaveMinOrder}
            disabled={minOrderStatus === "saving"}
            className="rounded-full border border-gold px-4 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-paper disabled:opacity-50"
          >
            {minOrderStatus === "saving" ? "Saving…" : minOrderStatus === "saved" ? "Saved" : "Save"}
          </button>
        </div>
        {minOrderStatus === "error" && (
          <p role="alert" className="mt-2 font-mono text-sm text-paprika">
            Enter a whole number between 1 and 100, or leave it empty.
          </p>
        )}
      </div>
    </div>
  );
}
