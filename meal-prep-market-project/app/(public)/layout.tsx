// app/(public)/layout.tsx
//
// Wraps only the fully public browsing surfaces (home/search, cook
// profiles, legal pages) with the marketing Navbar/Footer. Onboarding,
// inbox, cook-dashboard, and admin each have their own gated layouts
// and deliberately don't get this chrome.

import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
