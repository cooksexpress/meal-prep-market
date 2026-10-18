// components/cook-profile/OrderCheckout.tsx
//
// Lives alongside InquiryForm on the cook profile — customers can
// either send a quick inquiry, or build a cart and pay directly here.
// Only shown when the cook has at least one available menu item AND
// a connected Stripe account capable of accepting charges.
// Items are single dishes (1 meal each) or packs (a set number of
// meals). If the cook has a minimum order, checkout stays locked until
// the client has picked enough meals. The server checks this again.

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Package } from "@/lib/types/database";

interface OrderCheckoutProps {
  cookId: string;
  businessName: string;
  items: Package[];
  minOrderMeals: number | null;
}

interface CartLine {
  package_id: string;
  quantity: number;
}

function mealsPerUnit(item: Package): number {
  return item.item_type === "pack" ? Math.max(item.meal_count ?? 1, 1) : 1;
}

export function OrderCheckout({ cookId, businessName, items, minOrderMeals }: OrderCheckoutProps) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateQuantity(packageId: string, delta: number) {
    setCart((prev) => {
      const next = Math.max(0, (prev[packageId] ?? 0) + delta);
      const updated = { ...prev, [packageId]: next };
      if (next === 0) delete updated[packageId];
      return updated;
    });
  }

  const cartLines: CartLine[] = Object.entries(cart).map(([package_id, quantity]) => ({
    package_id,
    quantity,
  }));

  const itemById = new Map(items.map((i) => [i.id, i]));
  const subtotal = cartLines.reduce((sum, line) => {
    const item = itemById.get(line.package_id);
    return sum + (item?.indicative_price ?? 0) * line.quantity;
  }, 0);

  const totalMeals = cartLines.reduce((sum, line) => {
    const item = itemById.get(line.package_id);
    return sum + (item ? mealsPerUnit(item) * line.quantity : 0);
  }, 0);
  const mealsShort = minOrderMeals ? Math.max(minOrderMeals - totalMeals, 0) : 0;

  async function handleCheckout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cartLines.length === 0) {
      setErrorMessage("Add at least one item to your order.");
      return;
    }
    if (mealsShort > 0) {
      setErrorMessage(`This cook's minimum order is ${minOrderMeals} meals. Add ${mealsShort} more.`);
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);

    const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const res = await fetch(`${functionsUrl}/create-order-checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({
        cook_id: cookId,
        items: cartLines,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || undefined,
        delivery_address: deliveryAddress || undefined,
        order_notes: orderNotes || undefined,
      }),
    });

    const body = await res.json();

    if (!res.ok || !body.url) {
      setStatus("error");
      setErrorMessage(body?.error ?? "Couldn't start checkout. Please try again.");
      return;
    }

    window.location.href = body.url;
  }

  if (items.length === 0) return null;

  const dishes = items.filter((i) => i.item_type !== "pack");
  const packs = items.filter((i) => i.item_type === "pack");

  function renderGroup(title: string, groupItems: Package[]) {
    if (groupItems.length === 0) return null;
    return (
      <div className="mt-5">
        <p className="font-mono text-xs uppercase tracking-wide text-ink/60">{title}</p>
        <ul className="mt-2 divide-y divide-hairline border-y border-hairline">
          {groupItems.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              {item.image_url && (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-hairline">
                  <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="64px" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.name}</p>
                {item.description && <p className="text-sm text-ink/70">{item.description}</p>}
                <p className="font-mono text-xs text-gold">
                  {item.indicative_price != null && `$${item.indicative_price.toFixed(2)}`}
                  {item.item_type === "pack" && item.meal_count ? ` · ${item.meal_count} meals` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, -1)}
                  className="h-8 w-8 rounded-full border border-hairline font-mono"
                  aria-label={`Remove one ${item.name}`}
                >
                  −
                </button>
                <span className="w-5 text-center font-mono text-sm">{cart[item.id] ?? 0}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, 1)}
                  className="h-8 w-8 rounded-full border border-gold font-mono text-gold"
                  aria-label={`Add one ${item.name}`}
                >
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6">
      <h2 className="font-display text-2xl">Order from {businessName}</h2>

      {minOrderMeals && (
        <p className="mt-1 text-sm text-ink/60">Minimum order: {minOrderMeals} meals</p>
      )}

      {renderGroup("Single dishes", dishes)}
      {renderGroup("Packs", packs)}

      {cartLines.length > 0 && (
        <form onSubmit={handleCheckout} className="mt-6 space-y-4 border-t border-hairline pt-6">
          <p className="font-mono text-sm">
            {totalMeals} {totalMeals === 1 ? "meal" : "meals"} · Subtotal:{" "}
            <span className="text-ocean">${subtotal.toFixed(2)}</span>
          </p>
          {mealsShort > 0 && (
            <p className="text-sm text-paprika">
              Add {mealsShort} more {mealsShort === 1 ? "meal" : "meals"} to reach the minimum order.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              placeholder="Your name"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="border border-hairline bg-paper px-3 py-2"
            />
            <input
              type="email"
              placeholder="Email"
              required
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="border border-hairline bg-paper px-3 py-2"
            />
          </div>

          <input
            placeholder="Phone (optional)"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full border border-hairline bg-paper px-3 py-2"
          />

          <input
            placeholder="Delivery address (optional)"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            className="w-full border border-hairline bg-paper px-3 py-2"
          />

          <textarea
            placeholder="Order notes — gate code, dietary notes, delivery instructions"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            rows={2}
            className="w-full border border-hairline bg-paper px-3 py-2"
          />

          <label className="flex items-start gap-3 text-sm text-ink/80">
            <input type="checkbox" required className="mt-1 h-4 w-4 accent-ocean" />
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="underline">Terms of Service</Link>{" "}
              and the{" "}
              <Link href="/disclaimer" target="_blank" className="underline">Food Safety &amp; Liability Disclaimer</Link>
              , and I understand my order is with {businessName}, not Meal Prep Market.
            </span>
          </label>

          {errorMessage && (
            <p role="alert" className="font-mono text-sm text-paprika">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "submitting" || mealsShort > 0}
            className="w-full rounded-full bg-gold px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === "submitting" ? "Redirecting to payment…" : `Checkout — $${subtotal.toFixed(2)}`}
          </button>

          <p className="font-mono text-[11px] leading-relaxed text-ink/50">
            Meals and culinary services are prepared, sold, and provided directly by{" "}
            {businessName}. Meal Prep Market provides software tools and directory listing
            services only.
          </p>
        </form>
      )}
    </div>
  );
}
