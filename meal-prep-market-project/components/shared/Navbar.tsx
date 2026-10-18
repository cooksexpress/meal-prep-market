// components/shared/Navbar.tsx

import Link from "next/link";

export function Navbar() {
  return (
    <nav className="border-b border-hairline">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-display text-xl tracking-wide">
          Meal Prep <span className="italic text-gold">Market</span>
        </Link>
        <div className="hidden gap-6 font-mono text-xs uppercase tracking-wide text-ink/70 sm:flex">
          <Link href="/" className="hover:text-ink">
            Browse cooks
          </Link>
          <Link href="/onboarding" className="hover:text-ink">
            For cooks
          </Link>
        </div>
        <Link
          href="/onboarding"
          className="rounded-full border border-gold px-4 py-2 text-xs text-gold transition-colors hover:bg-gold hover:text-paper"
        >
          List your cooking
        </Link>
      </div>
    </nav>
  );
}
