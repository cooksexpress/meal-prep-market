// lib/supabase/server.ts
//
// Server-side Supabase client for Server Components, Server Actions,
// and Route Handlers. Reads/writes the session via Next.js cookies, so
// RLS applies automatically based on whoever is logged in (client,
// cook, or admin) — this client still only ever uses the anon key.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions)
            );
          } catch {
            // Called from a Server Component with no write access to
            // cookies — safe to ignore as long as middleware.ts is
            // refreshing the session on every request.
          }
        },
      },
    }
  );
}
