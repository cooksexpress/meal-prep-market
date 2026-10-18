// app/auth/callback/route.ts
//
// The email sign-in link points here. Supabase appends a `code` param;
// we exchange it for a session (setting the auth cookies), then send
// the person on:
//   redirect_to=/cook  -> cook sign-up step or dashboard (new cooks: step 1)
//   redirect_to=/start -> cook dashboard if they're a cook, else client inbox
//   redirect_to=/path  -> that page
//   (none)             -> client inbox
//
// If the link can't be used (expired, already used, or opened in a
// different app/browser than the one that asked for it, which is common
// on phones), we send them to the sign-in page, where they can type the
// 6-digit code from the same email instead.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCookHome } from "@/lib/auth/cookHome";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let redirectTo = searchParams.get("redirect_to") ?? "/inbox";

  // Only ever redirect within this site.
  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    redirectTo = "/inbox";
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (redirectTo === "/cook" || redirectTo === "/start") {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const cookHome = user ? await getCookHome(supabase, user.id) : null;
        redirectTo = cookHome ?? (redirectTo === "/cook" ? "/onboarding/tier" : "/inbox");
      }
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("link_expired", "1");
  return NextResponse.redirect(loginUrl);
}
