// components/shared/NavTracker.tsx
//
// Invisible. Records each page visited on the site (see navHistory.ts).

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordVisit } from "./navHistory";

export function NavTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) recordVisit(pathname);
  }, [pathname]);
  return null;
}
