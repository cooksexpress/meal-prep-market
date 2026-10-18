// components/auth/SignOutButton.tsx

"use client";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ className }: { className?: string }) {
  async function signOut() {
    await createClient().auth.signOut();
    // Full page load so every part of the site forgets the session.
    window.location.href = "/";
  }

  return (
    <button type="button" onClick={signOut} className={className}>
      Sign out
    </button>
  );
}
