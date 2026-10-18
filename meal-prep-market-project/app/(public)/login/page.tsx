// app/(public)/login/page.tsx
//
// Sign in for cooks (and clients) who already have an account. Cooks
// land on their dashboard; anyone mid-setup lands on their next step.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCookHome } from "@/lib/auth/cookHome";
import { EmailCodeSignIn } from "@/components/auth/EmailCodeSignIn";

export const metadata = { title: "Sign in | Meal Prep Market" };

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already signed in: skip straight to where they belong.
  if (user) {
    redirect((await getCookHome(supabase, user.id)) ?? "/inbox");
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-4xl">Sign in</h1>
      <p className="mt-3 text-ink/70">
        No password needed. Enter your email and we&rsquo;ll send you a code to sign in.
      </p>
      <div className="mt-8">
        <EmailCodeSignIn mode="signin" />
      </div>
    </main>
  );
}
