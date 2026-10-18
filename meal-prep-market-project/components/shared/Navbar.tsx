// components/shared/Navbar.tsx
//
// Signed out: "Sign in" + "List your cooking".
// Signed in: a button straight to their dashboard (cooks) or inbox.

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCookHome } from "@/lib/auth/cookHome";

export async function Navbar() {
  let home: string | null = null;
  let isCook = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const cookHome = await getCookHome(supabase, user.id);
      isCook = cookHome !== null;
      home = cookHome ?? "/inbox";
    }
  } catch {
    // If the session can't be read, just show the signed-out links.
  }

  return (
    <nav className="border-b border-hairline">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Link href="/" className="font-display text-xl tracking-wide">
          Meal Prep <span className="italic text-gold">Market</span>
        </Link>
        <div className="hidden gap-6 font-mono text-xs uppercase tracking-wide text-ink/70 md:flex">
          <Link href="/" className="hover:text-ink">
            Browse cooks
          </Link>
          <Link href="/onboarding" className="hover:text-ink">
            For cooks
          </Link>
        </div>
        {home ? (
          <Link
            href={home}
            className="rounded-full bg-gold px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90"
          >
            {isCook ? "My dashboard" : "My inbox"}
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="whitespace-nowrap rounded-full border border-hairline px-4 py-2 text-xs text-ink transition-colors hover:border-ink"
            >
              Sign in
            </Link>
            <Link
              href="/onboarding"
              className="whitespace-nowrap rounded-full border border-gold px-4 py-2 text-xs text-gold transition-colors hover:bg-gold hover:text-paper"
            >
              List your cooking
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
