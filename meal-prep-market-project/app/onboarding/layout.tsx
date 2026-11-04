// app/onboarding/layout.tsx
//
// Slim header for the sign-up steps: a Back arrow and the logo (which
// goes home), so cooks are never stuck without a way out.

import Link from "next/link";
import { BackButton } from "@/components/shared/BackButton";
import { LogoMark } from "@/components/shared/LogoMark";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4 sm:px-6">
          <BackButton />
          <Link href="/" className="flex items-center gap-2 whitespace-nowrap font-display text-lg tracking-wide" aria-label="Meal Prep Market home">
            <LogoMark className="h-7 w-auto shrink-0 sm:h-8" />
            <span>
              Meal Prep <span className="italic text-gold">Market</span>
            </span>
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
