// app/cook-dashboard/layout.tsx
//
// Auth already enforced by middleware for /cook-dashboard/*. This
// layout adds the nav shell shared across all dashboard pages, plus
// "View my listing" and "Sign out".

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/SignOutButton";

const links = [
  { href: "/cook-dashboard", label: "Overview" },
  { href: "/cook-dashboard/menu", label: "Menu" },
  { href: "/cook-dashboard/profile", label: "Profile" },
  { href: "/cook-dashboard/orders", label: "Orders" },
  { href: "/cook-dashboard/inquiries", label: "Inquiries" },
  { href: "/cook-dashboard/bank-setup", label: "Bank Setup" },
  { href: "/cook-dashboard/billing", label: "Billing" },
];

export default async function CookDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <nav className="border-b border-hairline">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="font-display text-lg">
              Meal Prep <span className="italic text-gold">Market</span>
            </Link>
            <div className="flex items-center gap-4 text-xs">
              {user && (
                <Link href={`/cooks/${user.id}`} className="text-gold underline">
                  View my listing
                </Link>
              )}
              <SignOutButton className="text-ink/60 underline hover:text-ink" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs uppercase tracking-wide text-ink/70">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-ink">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">{children}</div>
    </div>
  );
}
