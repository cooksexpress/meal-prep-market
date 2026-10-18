// components/auth/EmailCodeSignIn.tsx
//
// Passwordless sign-in used by both "Sign in" and "List your cooking".
// We email a link AND a short code. The link is handy on the same
// device; the code works anywhere (on phones, email apps often open
// links in their own browser, where the link can't finish signing in).
//
// The code only appears in the email if the Supabase email templates
// include {{ .Token }} (Authentication > Emails > Templates).

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCookHome } from "@/lib/auth/cookHome";

interface EmailCodeSignInProps {
  // "signin": existing accounts only. "signup": new cooks welcome.
  mode: "signin" | "signup";
}

const fieldClass = "w-full rounded-lg border border-hairline bg-paper px-3 py-3";
const labelClass = "font-mono text-xs uppercase tracking-wide text-ink/70";

export function EmailCodeSignIn({ mode }: EmailCodeSignInProps) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("link_expired") === "1") {
      setNotice(
        "That sign-in link couldn't be used. It may have expired, or opened in a different app. Enter your email below and use the code instead."
      );
    }
  }, []);

  async function sendCode(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      setMessage("Enter a valid email address.");
      return;
    }

    setBusy(true);
    setMessage(null);

    const supabase = createClient();
    const sentinel = mode === "signup" ? "/cook" : "/start";
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: mode === "signup",
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect_to=${sentinel}`,
      },
    });

    setBusy(false);

    if (error) {
      const lower = error.message.toLowerCase();
      if (mode === "signin" && (lower.includes("signup") || lower.includes("not found") || lower.includes("not allowed"))) {
        setMessage("We couldn't find an account with that email. New here? Use “List your cooking” instead.");
      } else if (lower.includes("rate") || lower.includes("seconds")) {
        setMessage("Please wait a minute before asking for another code.");
      } else {
        setMessage("Couldn't send the email. Please try again.");
      }
      return;
    }

    setEmail(cleanEmail);
    setStep("code");
    setNotice(null);
  }

  async function verifyCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = code.replace(/\s/g, "");
    if (!/^\d{6,10}$/.test(token)) {
      setMessage("Enter the code from your email (numbers only).");
      return;
    }

    setBusy(true);
    setMessage(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

    if (error || !data.user) {
      setBusy(false);
      setMessage("That code didn't work. Check it, or ask for a new one.");
      return;
    }

    const cookHome = await getCookHome(supabase, data.user.id);
    const destination = cookHome ?? (mode === "signup" ? "/onboarding/tier" : "/inbox");
    router.replace(destination);
    router.refresh();
  }

  if (step === "code") {
    return (
      <form onSubmit={verifyCode} className="space-y-4">
        <p className="text-ink/70">
          We&rsquo;ve emailed <span className="text-ink">{email}</span>. Enter the code from the
          email, or tap the link in it if you&rsquo;re on this device.
        </p>
        <div className="flex flex-col gap-1">
          <label htmlFor="code" className={labelClass}>
            Code
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setMessage(null);
            }}
            className={`${fieldClass} font-mono text-2xl tracking-[0.3em]`}
          />
        </div>

        {message && (
          <p role="alert" className="font-mono text-sm text-paprika">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-gold px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <button
            type="button"
            onClick={() => sendCode()}
            disabled={busy}
            className="text-gold underline disabled:opacity-50"
          >
            Send a new code
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setMessage(null);
            }}
            className="text-ink/60 underline"
          >
            Use a different email
          </button>
        </div>
        <p className="text-sm text-ink/50">Can&rsquo;t see it? Check your spam or promotions folder.</p>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-4">
      {notice && (
        <p className="rounded-2xl border border-gold/40 bg-gold/5 p-4 text-sm text-ink/80">{notice}</p>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setMessage(null);
          }}
          className={fieldClass}
        />
      </div>

      {message && (
        <p role="alert" className="font-mono text-sm text-paprika">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-gold px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Sending…" : mode === "signup" ? "Get started" : "Email me a sign-in code"}
      </button>

      <p className="text-center text-sm text-ink/60">
        {mode === "signup" ? (
          <>
            Already listed?{" "}
            <Link href="/login" className="text-gold underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New cook?{" "}
            <Link href="/onboarding" className="text-gold underline">
              List your cooking
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
