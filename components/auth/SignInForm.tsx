"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

const RESEND_SECONDS = 60;

/** Messages for the `?error=` codes app/auth/confirm/actions.ts redirects with. */
const ERROR_MESSAGES: Record<string, string> = {
  link_invalid: "That sign-in link is no longer valid. Request a new code below.",
};

export type SignInVariant = "portal" | "rsvp";

const VARIANTS: Record<
  SignInVariant,
  { input: string; button: string; error: string; notice: string; ghost: string }
> = {
  portal: {
    input:
      "h-12 w-full rounded-sm border border-black/10 bg-sun-50 px-4 font-body text-[14px] text-base-800 outline-none transition focus:border-sun-300 focus:bg-white",
    button:
      "inline-flex h-14 w-full items-center justify-center gap-2 rounded-pill bg-orange px-6 font-display text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto sm:self-end",
    error: "font-body text-[13px] text-red-500",
    notice: "font-body text-[13px] text-green-600",
    ghost:
      "font-body text-[13px] text-sun-400 underline underline-offset-4 transition-opacity hover:opacity-70 disabled:opacity-40",
  },
  rsvp: {
    input:
      "h-12 w-full rounded-sm border border-[#f0d8bc] bg-[#fae9d4] px-4 text-[14px] text-[#2f2418] outline-none transition focus:border-[#e7b56c] focus:bg-[#f8e0bf]",
    button:
      "inline-flex h-14 w-full items-center justify-center gap-2 rounded-[100px] bg-[#F80] px-6 text-white transition-colors hover:bg-[#e67300] disabled:opacity-50 sm:w-auto sm:self-end",
    error: "text-[13px] text-red-500",
    notice: "text-[13px] text-green-600",
    ghost:
      "text-[13px] text-[#2f2a26] underline underline-offset-4 transition-opacity hover:opacity-70 disabled:opacity-40",
  },
};

export default function SignInForm({
  variant,
  errorCode,
}: {
  variant: SignInVariant;
  errorCode?: string;
}) {
  const styles = VARIANTS[variant];

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(errorCode ? (ERROR_MESSAGES[errorCode] ?? "") : "");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeInputRef.current?.focus();
  }, [step]);

  const sendCode = async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const res = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send sign-in code");

      setStep("code");
      setCode("");
      setCooldown(RESEND_SECONDS);
      setNotice(`We sent a 6-digit code to ${data.email ?? email}.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to verify code");

      // A full navigation rather than router.push: the session cookies were set
      // on this response, and a hard load guarantees proxy.ts and the server
      // components both see them.
      window.location.assign(data.destination);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (step === "email") void sendCode();
    else void verifyCode();
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      {step === "email" ? (
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError("");
          }}
          placeholder="your@email.com"
          required
          className={styles.input}
        />
      ) : (
        <input
          ref={codeInputRef}
          type="text"
          name="code"
          inputMode="numeric"
          // Lets iOS and Android offer the code straight from the notification.
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
            if (error) setError("");
          }}
          placeholder="000000"
          required
          className={`${styles.input} text-center text-[20px] tracking-[0.5em]`}
        />
      )}

      {error && <p className={styles.error}>{error}</p>}
      {notice && <p className={styles.notice}>{notice}</p>}

      <button type="submit" disabled={loading || (step === "code" && code.length !== 6)} className={styles.button}>
        {loading
          ? step === "email"
            ? "Sending…"
            : "Verifying…"
          : step === "email"
            ? "Send code"
            : "Verify code"}
        <ArrowUp size={18} className="rotate-90" />
      </button>

      {step === "code" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
              setNotice("");
            }}
            className={styles.ghost}
          >
            Use a different email
          </button>
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={loading || cooldown > 0}
            className={styles.ghost}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        </div>
      )}
    </form>
  );
}
