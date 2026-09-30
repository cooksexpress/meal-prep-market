// app/order/complete/page.tsx
//
// Stripe redirects here after a successful Direct Charge checkout.
// Order status is flipped to 'paid' by stripe-connect-webhook, which
// may land a moment after this page renders — so this reads whatever
// status currently exists rather than assuming 'paid' is already set.

import { createClient } from "@/lib/supabase/server";

interface OrderCompletePageProps {
  searchParams: Promise<{ order_id?: string }>;
}

export default async function OrderCompletePage({ searchParams }: OrderCompletePageProps) {
  const { order_id } = await searchParams;

  if (!order_id) {
    return (
      <main className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="font-display text-2xl">Order not found</p>
      </main>
    );
  }

  const supabase = await createClient();

  const { data: order } = await supabase
    .from("cm_orders")
    .select("id, cook_id, status, subtotal_amount, customer_name, order_notes")
    .eq("id", order_id)
    .single();

  if (!order) {
    return (
      <main className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="font-display text-2xl">Order not found</p>
      </main>
    );
  }

  const { data: cook } = await supabase
    .from("cm_cooks")
    .select("business_name, public_contact_email, public_contact_phone")
    .eq("id", order.cook_id)
    .single();

  const { data: items } = await supabase
    .from("cm_order_items")
    .select("item_name, quantity, line_total")
    .eq("order_id", order.id);

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="font-display text-3xl text-ocean">
        {order.status === "paid" ? "Order confirmed" : "Payment processing…"}
      </p>
      <p className="mt-2 text-ink/70">
        Thanks, {order.customer_name}. A receipt has been emailed to you.
      </p>

      <div className="mt-8 divide-y divide-hairline border-y border-hairline">
        {(items ?? []).map((item, i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <p>
              {item.quantity} × {item.item_name}
            </p>
            <p className="font-mono text-sm text-ocean">${item.line_total.toFixed(2)}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-right font-mono text-sm">
        Total: <span className="text-ocean">${order.subtotal_amount.toFixed(2)}</span>
      </p>

      {cook && (
        <div className="mt-8 border border-hairline p-6">
          <p className="font-medium">
            Need to adjust your order or delivery details? Contact {cook.business_name} directly
            {cook.public_contact_phone ? ` at ${cook.public_contact_phone}` : ""}
            {cook.public_contact_email ? ` or ${cook.public_contact_email}` : ""}.
          </p>
        </div>
      )}
    </main>
  );
}
