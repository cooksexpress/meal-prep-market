// app/cook-dashboard/orders/page.tsx
//
// Shows recent paid orders with phone + order_notes visible per order
// (explicitly required), plus the single-button weekly CSV export.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CookDashboardOrdersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/onboarding");

  const { data: orders } = await supabase
    .from("cm_orders")
    .select("id, customer_name, customer_phone, delivery_address, order_notes, subtotal_amount, created_at, status")
    .eq("cook_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Orders</h1>
          <p className="mt-1 text-ink/70">Your most recent orders, and a one-click weekly summary.</p>
        </div>
        <a
          href="/cook-dashboard/orders/export"
          className="border border-ocean px-5 py-2.5 font-mono text-sm text-ocean transition-colors hover:bg-ocean hover:text-paper"
        >
          Export Weekly Summary
        </a>
      </div>

      {!orders || orders.length === 0 ? (
        <p className="mt-8 text-ink/70">No orders yet.</p>
      ) : (
        <div className="mt-8 divide-y divide-hairline border-y border-hairline">
          {orders.map((order) => (
            <div key={order.id} className="py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{order.customer_name}</p>
                <span
                  className={`font-mono text-xs ${
                    order.status === "paid"
                      ? "text-ocean"
                      : order.status === "pending"
                      ? "text-butter"
                      : "text-paprika"
                  }`}
                >
                  {order.status} — ${order.subtotal_amount.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-4 font-mono text-xs text-ink/60">
                {order.customer_phone && <span>📞 {order.customer_phone}</span>}
                {order.delivery_address && <span>{order.delivery_address}</span>}
              </div>
              {order.order_notes && <p className="mt-1 text-sm text-ink/80">Notes: {order.order_notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
