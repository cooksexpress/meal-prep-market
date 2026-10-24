// components/menu/MenuEditor.tsx
//
// The one menu editor cooks use, both during sign-up and in their
// dashboard. A menu has two kinds of items:
//   - Single dish: one meal. Clients choose how many they want.
//   - Pack: a bundle of meals at a set price (e.g. 7-meal weekly pack).
// Cooks can also set a minimum number of meals per order.
// Everything is stored in cm_packages (item_type = 'dish' | 'pack').
// Each item can have its own optional photo (image_url), uploaded via
// lib/images/uploadImage (converts HEIC phone photos, shrinks big ones).
// Each item can be edited in place (Edit), switched between Available
// and Sold out (dashboard only), or removed (asks "are you sure" first).

"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { uploadCookImage, removeCookImage } from "@/lib/images/uploadImage";
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
  const [status, setStatus] = useState<"idle" | "submitting" | "error" | "photo-error">("idle");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBusyId, setPhotoBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  // Editing an existing item (one at a time).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editMealCount, setEditMealCount] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editStatus, setEditStatus] = useState<"idle" | "saving" | "error">("idle");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

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

  // Tells the cook what's still missing while the Add button is greyed out.
  const missingHint = !name.trim()
    ? `Type a ${isPack ? "pack" : "dish"} name to add it.`
    : price === "" || !(priceNumber > 0)
      ? "Type a price to add it."
      : isPack && !(Number.isInteger(mealCountNumber) && mealCountNumber >= 2)
        ? "Type how many meals are in the pack (2 or more)."
        : null;

  const dishes = items.filter((i) => i.item_type !== "pack");
  const packs = items.filter((i) => i.item_type === "pack");

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("submitting");

    let imageUrl: string | null = null;
    if (photoFile) {
      const uploaded = await uploadCookImage(supabase, cookId, photoFile, "menu");
      if (!uploaded) {
        setStatus("photo-error");
        return;
      }
      imageUrl = uploaded.publicUrl;
    }

    const { data, error } = await supabase
      .from("cm_packages")
      .insert({
        cook_id: cookId,
        item_type: itemType,
        image_url: imageUrl,
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
      await removeCookImage(supabase, imageUrl);
      setStatus("error");
      return;
    }

    setItems((prev) => [...prev, data]);
    clearPhoto();
    setName("");
    setDescription("");
    setPrice("");
    setMealCount("");
    setDietaryTags("");
    setStatus("idle");
  }

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  function handlePickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    // HEIC can't be previewed by most browsers; it still uploads fine.
    const lower = file.name.toLowerCase();
    const previewable = !/hei(c|f)/.test(file.type) && !lower.endsWith(".heic") && !lower.endsWith(".heif");
    setPhotoPreview(previewable ? URL.createObjectURL(file) : null);
    if (status === "photo-error") setStatus("idle");
  }

  async function handleChangeItemPhoto(item: Package, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPhotoBusyId(item.id);
    setRowError(null);

    const uploaded = await uploadCookImage(supabase, cookId, file, "menu");
    if (!uploaded) {
      setRowError("That photo couldn't be added. Please try a different one.");
      setPhotoBusyId(null);
      return;
    }

    const { error } = await supabase
      .from("cm_packages")
      .update({ image_url: uploaded.publicUrl })
      .eq("id", item.id);

    if (error) {
      await removeCookImage(supabase, uploaded.publicUrl);
      setRowError("That photo couldn't be saved. Please try again.");
      setPhotoBusyId(null);
      return;
    }

    const oldUrl = item.image_url;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, image_url: uploaded.publicUrl } : i)));
    setPhotoBusyId(null);
    await removeCookImage(supabase, oldUrl);
  }

  function startEdit(item: Package) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditDescription(item.description ?? "");
    setEditPrice(item.indicative_price != null ? String(item.indicative_price) : "");
    setEditMealCount(item.meal_count != null ? String(item.meal_count) : "");
    setEditTags(item.dietary_tags.join(", "));
    setEditStatus("idle");
    setConfirmRemoveId(null);
  }

  function editProblem(item: Package): string | null {
    const p = Number(editPrice);
    const m = Number(editMealCount);
    if (!editName.trim()) return "Type a name.";
    if (editPrice === "" || !(p > 0)) return "Type a price.";
    if (item.item_type === "pack" && !(Number.isInteger(m) && m >= 2))
      return "Type how many meals are in the pack (2 or more).";
    return null;
  }

  async function handleSaveEdit(item: Package) {
    if (editProblem(item)) return;
    setEditStatus("saving");
    const changes = {
      name: editName.trim(),
      description: editDescription.trim() || null,
      indicative_price: Number(editPrice),
      meal_count: item.item_type === "pack" ? Number(editMealCount) : 1,
      dietary_tags: parseTags(editTags),
    };
    const { error } = await supabase.from("cm_packages").update(changes).eq("id", item.id);
    if (error) {
      setEditStatus("error");
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...changes } : i)));
    setEditingId(null);
    setEditStatus("idle");
  }

  async function handleRemove(itemId: string) {
    setConfirmRemoveId(null);
    const item = items.find((i) => i.id === itemId);
    await supabase.from("cm_packages").delete().eq("id", itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    await removeCookImage(supabase, item?.image_url ?? null);
  }

  async function handleSetAvailability(item: Package, nextValue: boolean) {
    if (item.is_available === nextValue) return;
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

  function renderEditForm(item: Package) {
    const itemIsPack = item.item_type === "pack";
    const problem = editProblem(item);
    return (
      <li key={item.id} className="space-y-3 py-4">
        <p className={labelClass}>Editing {itemIsPack ? "pack" : "dish"}</p>
        <div className="flex flex-col gap-1">
          <label htmlFor={`edit-name-${item.id}`} className={labelClass}>
            {itemIsPack ? "Pack name" : "Dish name"}
          </label>
          <input
            id={`edit-name-${item.id}`}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`edit-desc-${item.id}`} className={labelClass}>
            What&rsquo;s included (optional)
          </label>
          <textarea
            id={`edit-desc-${item.id}`}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={3}
            className={fieldClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={`edit-price-${item.id}`} className={labelClass}>
              {itemIsPack ? "Pack price ($)" : "Price per meal ($)"}
            </label>
            <input
              id={`edit-price-${item.id}`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              className={fieldClass}
            />
          </div>
          {itemIsPack && (
            <div className="flex flex-col gap-1">
              <label htmlFor={`edit-meals-${item.id}`} className={labelClass}>
                Meals in pack
              </label>
              <input
                id={`edit-meals-${item.id}`}
                type="number"
                inputMode="numeric"
                step="1"
                min="2"
                value={editMealCount}
                onChange={(e) => setEditMealCount(e.target.value)}
                className={fieldClass}
              />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`edit-tags-${item.id}`} className={labelClass}>
            Dietary (optional)
          </label>
          <input
            id={`edit-tags-${item.id}`}
            placeholder="e.g. Gluten-free, High-protein"
            value={editTags}
            onChange={(e) => setEditTags(e.target.value)}
            className={fieldClass}
          />
        </div>
        <p className="text-sm text-ink/50">To change the photo, tap the photo in your menu list.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleSaveEdit(item)}
            disabled={editStatus === "saving" || problem !== null}
            className="rounded-full bg-gold px-5 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {editStatus === "saving" ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="rounded-full border border-hairline px-5 py-2 text-sm text-ink/70 hover:border-ink"
          >
            Cancel
          </button>
        </div>
        {problem && <p className="text-sm text-ink/50">{problem}</p>}
        {editStatus === "error" && (
          <p role="alert" className="font-mono text-sm text-paprika">
            Couldn&rsquo;t save that. Please try again.
          </p>
        )}
      </li>
    );
  }

  function renderItem(item: Package) {
    if (editingId === item.id) return renderEditForm(item);
    const itemIsPack = item.item_type === "pack";
    return (
      <li key={item.id} className="space-y-3 py-4">
        <div className="flex items-start gap-4">
          <label
            className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-hairline text-center font-mono text-[10px] leading-tight text-ink/60 hover:border-gold hover:text-gold"
            aria-label={item.image_url ? `Change photo for ${item.name}` : `Add photo for ${item.name}`}
          >
            {item.image_url ? (
              <Image src={item.image_url} alt="" fill className="object-cover" sizes="64px" />
            ) : (
              <span>{photoBusyId === item.id ? "Uploading…" : "+ Photo"}</span>
            )}
            {item.image_url && photoBusyId === item.id && (
              <span className="absolute inset-0 flex items-center justify-center bg-paper/70">…</span>
            )}
            <input
              type="file"
              accept="image/*,.heic,.heif"
              className="hidden"
              disabled={photoBusyId !== null}
              onChange={(e) => handleChangeItemPhoto(item, e)}
            />
          </label>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{item.name}</p>
              <span className="shrink-0 font-mono text-sm text-gold">{formatPrice(item.indicative_price)}</span>
            </div>
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
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {showAvailability && (
            <div
              role="radiogroup"
              aria-label={`Is ${item.name} available this week?`}
              className="inline-flex overflow-hidden rounded-full border border-hairline text-xs"
            >
              <button
                type="button"
                role="radio"
                aria-checked={item.is_available}
                onClick={() => handleSetAvailability(item, true)}
                className={`px-3 py-1.5 transition-colors ${
                  item.is_available ? "bg-gold font-medium text-paper" : "text-ink/60 hover:text-ink"
                }`}
              >
                {item.is_available ? "✓ Available" : "Available"}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={!item.is_available}
                onClick={() => handleSetAvailability(item, false)}
                className={`px-3 py-1.5 transition-colors ${
                  !item.is_available ? "bg-paprika font-medium text-paper" : "text-ink/60 hover:text-ink"
                }`}
              >
                {!item.is_available ? "✓ Sold out" : "Sold out"}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => startEdit(item)}
            className="rounded-full border border-gold px-3 py-1.5 text-xs text-gold transition-colors hover:bg-gold hover:text-paper"
          >
            Edit
          </button>

          {confirmRemoveId === item.id ? (
            <span className="flex items-center gap-2 text-xs">
              <span className="text-ink/70">Remove this?</span>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="font-mono text-paprika underline"
              >
                Yes, remove
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemoveId(null)}
                className="font-mono text-ink/60 underline"
              >
                Keep
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemoveId(item.id)}
              className="font-mono text-xs text-paprika underline"
            >
              Remove
            </button>
          )}
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

      {rowError && (
        <p role="alert" className="font-mono text-sm text-paprika">
          {rowError}
        </p>
      )}

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
            placeholder={isPack ? "e.g. 7-meal weekly pack" : "e.g. Chicken & rice bowl"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className={labelClass}>Photo (optional)</span>
          <div className="flex items-center gap-3">
            <label className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-hairline text-center font-mono text-[11px] text-ink/60 hover:border-gold hover:text-gold">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{photoFile ? "Photo ready" : "+ Add photo"}</span>
              )}
              <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handlePickPhoto} />
            </label>
            {photoFile ? (
              <button type="button" onClick={clearPhoto} className="font-mono text-xs text-paprika underline">
                Remove photo
              </button>
            ) : (
              <p className="text-sm text-ink/50">A photo of this {isPack ? "pack" : "dish"} helps clients choose.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="menu-description" className={labelClass}>
            What&rsquo;s included (optional)
          </label>
          <textarea
            id="menu-description"
            placeholder={
              isPack
                ? "e.g. One of each dish on this week's menu"
                : "e.g. Grilled chicken, brown rice, seasonal greens"
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
              placeholder={isPack ? "e.g. 89" : "e.g. 14"}
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
                placeholder="e.g. 7"
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
                placeholder="e.g. Gluten-free"
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
              placeholder="e.g. High-protein, Dairy-free"
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
        {missingHint && status !== "submitting" && <p className="text-sm text-ink/50">{missingHint}</p>}
        {status === "error" && (
          <p role="alert" className="font-mono text-sm text-paprika">
            Couldn&rsquo;t add that. Please try again.
          </p>
        )}
        {status === "photo-error" && (
          <p role="alert" className="font-mono text-sm text-paprika">
            That photo couldn&rsquo;t be uploaded. Try a different photo, or add it without one.
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
            placeholder="e.g. 3"
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
