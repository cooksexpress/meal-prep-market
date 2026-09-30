// app/cook-dashboard/layout.tsx
//
// Auth already enforced by middleware for /cook-dashboard/*. This
// layout just adds the nav shell shared across all dashboard pages.

import Link from "next/link";

export default function CookDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-hairline">
        <div className="mx-auto flex max-w-4xl items-center gap-6 px-6 py-4">
          <span className="font-display text-lg">Meal Prep Market</span>
          <div className="flex flex-wrap gap-4 font-mono text-xs uppercase tracking-wide text-ink/70">
            <Link href="/cook-dashboard" className="hover:text-ink">
              Overview
            </Link>
            <Link href="/cook-dashboard/bank-setup" className="hover:text-ink">
              Bank Setup
            </Link>
            <Link href="/cook-dashboard/menu" className="hover:text-ink">
              Menu
            </Link>
            <Link href="/cook-dashboard/orders" className="hover:text-ink">
              Orders
            </Link>
            <Link href="/cook-dashboard/inquiries" className="hover:text-ink">
              Inquiries
            </Link>
            <Link href="/cook-dashboard/profile" className="hover:text-ink">
              Profile
            </Link>
            <Link href="/cook-dashboard/billing" className="hover:text-ink">
              Billing
            </Link>
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-4xl px-6 py-10">{children}</div>
    </div>
  );
}
