// app/auth/callback/route.ts
//
// The magic link's emailRedirectTo points here. Supabase appends a
// `code` param; we exchange it for a session (setting the auth
// cookies), then redirect into the client's inbox.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect_to") ?? "/inbox";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // Missing or invalid code — send them to a plain error state rather
  // than silently landing in a gated page with no session.
  const errorUrl = new URL("/", origin);
  errorUrl.searchParams.set("auth_error", "1");
  return NextResponse.redirect(errorUrl);
}
