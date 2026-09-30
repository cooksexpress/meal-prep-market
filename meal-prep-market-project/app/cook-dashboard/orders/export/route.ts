// app/cook-dashboard/orders/export/route.ts
//
// GET /cook-dashboard/orders/export
// Runs under the cook's own session (cookie-based server client), so
// RLS's cm_orders_select policy naturally scopes this to their own
// paid orders from the last 7 days — no service role needed here.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: orders, error } = await supabase
    .from("cm_orders")
    .select(
      "id, customer_name, customer_phone, delivery_address, order_notes, created_at, cm_order_items(item_name, quantity)"
    )
    .eq("cook_id", user.id)
    .eq("status", "paid")
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }

  // --- Section 1: Master Kitchen / Service Totals ---
  const itemTotals = new Map<string, number>();
  for (const order of orders ?? []) {
    for (const item of (order as unknown as { cm_order_items: { item_name: string; quantity: number }[] })
      .cm_order_items ?? []) {
      itemTotals.set(item.item_name, (itemTotals.get(item.item_name) ?? 0) + item.quantity);
    }
  }

  const kitchenRows = [
    "Item,Total Quantity",
    ...[...itemTotals.entries()].map(([name, qty]) => `${csvEscape(name)},${qty}`),
  ];

  // --- Section 2: Delivery & Contact Sheet ---
  const contactRows = [
    "Customer Name,Phone,Delivery Address,Order Notes,Order Date",
    ...(orders ?? []).map((o) =>
      [
        csvEscape(o.customer_name),
        csvEscape(o.customer_phone ?? ""),
        csvEscape(o.delivery_address ?? ""),
        csvEscape(o.order_notes ?? ""),
        new Date(o.created_at).toLocaleDateString("en-AU"),
      ].join(",")
    ),
  ];

  const csv = [
    "MASTER KITCHEN / SERVICE TOTALS",
    ...kitchenRows,
    "",
    "DELIVERY & CONTACT SHEET",
    ...contactRows,
  ].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="weekly-summary-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
