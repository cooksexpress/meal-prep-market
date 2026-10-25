// app/admin/layout.tsx
//
// Auth + admin-membership already enforced by middleware for
// /admin/* (checks cm_admins there before this layout even renders).

import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-hairline bg-ink text-paper">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
          <span className="font-display text-lg">Admin</span>
          <div className="flex flex-wrap gap-4 font-mono text-xs uppercase tracking-wide text-paper/70">
            <Link href="/admin/stats" className="hover:text-paper">
              Visitors
            </Link>
            <Link href="/admin" className="hover:text-paper">
              Cooks
            </Link>
            <Link href="/admin/moderation" className="hover:text-paper">
              Moderation
            </Link>
            <Link href="/" className="hover:text-paper">
              Back to site
            </Link>
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-4xl px-6 py-10">{children}</div>
    </div>
  );
}
