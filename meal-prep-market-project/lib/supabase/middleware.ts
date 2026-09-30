// lib/supabase/middleware.ts
//
// Refreshes the Supabase session on every request and gates the
// authenticated areas of the app. Public routes (/, /cooks, /cooks/*)
// are intentionally left untouched here so they keep rendering for
// anonymous visitors and search engines.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

const CLIENT_GATED_PREFIX = "/inbox";
const ONBOARDING_GATED_PREFIX = "/onboarding";
const COOK_GATED_PREFIX = "/cook-dashboard";
const ADMIN_GATED_PREFIX = "/admin";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const needsClientAuth = path.startsWith(CLIENT_GATED_PREFIX);
  // Bare /onboarding is the email-capture entry point and must stay
  // public; every step after it requires a session.
  const needsOnboardingAuth = path.startsWith(`${ONBOARDING_GATED_PREFIX}/`);
  const needsCookAuth = path.startsWith(COOK_GATED_PREFIX);
  const needsAdminAuth = path.startsWith(ADMIN_GATED_PREFIX);

  if ((needsClientAuth || needsOnboardingAuth || needsCookAuth || needsAdminAuth) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.set("login_required", path);
    return NextResponse.redirect(redirectUrl);
  }

  // Admin check happens server-side against cm_admins, not just "is
  // logged in" — a logged-in cook or client must not pass this gate.
  if (needsAdminAuth && user) {
    const { data: adminRow } = await supabase
      .from("cm_admins")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!adminRow) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
