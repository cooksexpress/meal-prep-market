// components/shared/Navbar.tsx
//
// Signed out: one "I'm a cook" button (customers never need to sign in).
// Signed in: a button straight to their dashboard (cooks) or inbox,
// plus a small "Sign out" link.

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCookHome } from "@/lib/auth/cookHome";
import { BackButton } from "./BackButton";
import { SignOutButton } from "@/components/auth/SignOutButton";

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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-4 sm:gap-3 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <BackButton />
          <Link href="/" className="font-display text-lg leading-tight tracking-wide sm:text-xl">
            Meal Prep <span className="italic text-gold">Market</span>
          </Link>
        </div>
        <div className="hidden gap-6 font-mono text-xs uppercase tracking-wide text-ink/70 md:flex">
          <Link href="/" className="hover:text-ink">
            Browse cooks
          </Link>
        </div>
        {home ? (
          <div className="flex items-center gap-3">
            <SignOutButton className="whitespace-nowrap text-xs text-ink/60 underline hover:text-ink" />
            <Link
              href={home}
              className="whitespace-nowrap rounded-full bg-gold px-3 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 sm:px-4"
            >
              {isCook ? "My dashboard" : "My inbox"}
            </Link>
          </div>
        ) : (
          <Link
            href="/onboarding"
            className="whitespace-nowrap rounded-full border border-gold px-4 py-2 text-xs text-gold transition-colors hover:bg-gold hover:text-paper"
          >
            I&rsquo;m a cook
          </Link>
        )}
      </div>
    </nav>
  );
}
