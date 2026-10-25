// app/cook-dashboard/bank-setup/layout.tsx
//
// Hidden while online payments are switched off (lib/features.ts):
// anyone opening this page is sent back to their dashboard.

import { redirect } from "next/navigation";
import { ONLINE_PAYMENTS } from "@/lib/features";

export default function Layout({ children }: { children: React.ReactNode }) {
  if (!ONLINE_PAYMENTS) redirect("/cook-dashboard");
  return <>{children}</>;
}
