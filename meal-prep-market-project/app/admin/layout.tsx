// app/admin/layout.tsx
//
// Auth + admin-membership already enforced by middleware for
// /admin/* (checks cm_admins there before this layout even renders).

import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-hairline bg-ink text-paper">
        <div className="mx-auto flex max-w-4xl items-center gap-6 px-6 py-4">
          <span className="font-display text-lg">Admin</span>
          <div className="flex gap-4 font-mono text-xs uppercase tracking-wide text-paper/70">
            <Link href="/admin" className="hover:text-paper">
              Billing overview
            </Link>
            <Link href="/admin/moderation" className="hover:text-paper">
              Moderation
            </Link>
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-4xl px-6 py-10">{children}</div>
    </div>
  );
}
