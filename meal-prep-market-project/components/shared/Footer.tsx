// components/shared/Footer.tsx

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8">
        <p className="font-mono text-xs text-ink/60">
          &copy; {new Date().getFullYear()} Meal Prep Market. Gold Coast, QLD. An
          advertising directory only — bookings and payment are arranged directly with your cook.
        </p>
        <div className="flex flex-wrap gap-4 font-mono text-xs uppercase tracking-wide text-ink/70">
          <Link href="/terms" className="underline hover:text-ink">
            Terms of Service
          </Link>
          <Link href="/privacy" className="underline hover:text-ink">
            Privacy Policy
          </Link>
          <Link href="/disclaimer" className="underline hover:text-ink">
            Food Safety &amp; Liability Disclaimer
          </Link>
        </div>
      </div>
    </footer>
  );
}
