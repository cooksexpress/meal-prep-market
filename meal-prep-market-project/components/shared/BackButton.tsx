// components/shared/BackButton.tsx
//
// A round "‹" back arrow. Goes back to the previous Meal Prep Market
// page if there is one; otherwise to a sensible page (the homepage, or
// the dashboard overview inside the dashboard), so it never leaves the
// site. Hidden on the homepage and the dashboard overview.

"use client";

import { usePathname, useRouter } from "next/navigation";
import { readStack } from "./navHistory";

const HIDE_ON = ["/", "/cook-dashboard"];

function fallbackFor(pathname: string): string {
  if (pathname.startsWith("/cook-dashboard")) return "/cook-dashboard";
  return "/";
}

export function BackButton({ className = "" }: { className?: string }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  if (HIDE_ON.includes(pathname)) return null;

  function goBack() {
    const stack = readStack();
    if (stack.length >= 2 && stack[stack.length - 1] === pathname) {
      router.back();
    } else {
      router.push(fallbackFor(pathname));
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Go back"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline text-ink transition-colors hover:border-gold hover:text-gold ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
