// components/cook-profile/OrderCheckout.tsx
//
// Lives alongside InquiryForm on the cook profile — customers can
// either send a quick inquiry, or build a cart and pay directly here.
// Only shown when the cook has at least one available menu item AND
// a connected Stripe account capable of accepting charges.

"use client";

import { useState } from "react";
import type { Package } from "@/lib/types/database";

interface OrderCheckoutProps {
  cookId: string;
  businessName: string;
  items: Package[];
}

interface CartLine {
  package_id: string;
  quantity: number;
}

export function OrderCheckout({ cookId, businessName, items }: OrderCheckoutProps) {
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

  async function handleCheckout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cartLines.length === 0) {
      setErrorMessage("Add at least one item to your order.");
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

  return (
    <div className="border border-hairline p-6">
      <h2 className="font-display text-2xl">Order from {businessName}</h2>

      <ul className="mt-4 divide-y divide-hairline">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="font-medium">{item.name}</p>
              {item.indicative_price != null && (
                <p className="font-mono text-xs text-ocean">${item.indicative_price.toFixed(2)}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateQuantity(item.id, -1)}
                className="h-7 w-7 border border-hairline font-mono"
                aria-label={`Remove one ${item.name}`}
              >
                −
              </button>
              <span className="w-4 text-center font-mono text-sm">{cart[item.id] ?? 0}</span>
              <button
                type="button"
                onClick={() => updateQuantity(item.id, 1)}
                className="h-7 w-7 border border-hairline font-mono"
                aria-label={`Add one ${item.name}`}
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      {cartLines.length > 0 && (
        <form onSubmit={handleCheckout} className="mt-6 space-y-4 border-t border-hairline pt-6">
          <p className="font-mono text-sm">
            Subtotal: <span className="text-ocean">${subtotal.toFixed(2)}</span>
          </p>

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

          {errorMessage && (
            <p role="alert" className="font-mono text-sm text-paprika">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full bg-paprika px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
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
