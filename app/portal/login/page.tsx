"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowUp } from "lucide-react";

export default function PortalLoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to send magic link");
      }

      setMessage("Magic link sent! Check your email.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-surface-page p-3">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-sm bg-surface-card p-8 shadow-pop">
        <Image src="/icon.svg" alt="SummerHacks" width={44} height={44} />
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-display text-[26px] font-medium tracking-tighter text-base-800">
            Sign in to the Hacker Portal
          </h1>
          <p className="font-body text-[14px] leading-snug text-sun-400">
            Enter the email you applied with — we&apos;ll send you a magic link to sign in.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.nativeEvent.isComposing || loading) {
                return;
              }
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }}
            placeholder="your@email.com"
            required
            className="h-12 w-full rounded-sm border border-black/10 bg-sun-50 px-4 font-body text-[14px] text-base-800 outline-none transition focus:border-sun-300 focus:bg-white"
          />

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-14 items-center justify-center gap-2 self-end rounded-pill bg-orange px-6 font-display text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send magic link"}
            <ArrowUp size={18} className="rotate-90" />
          </button>

          {error && <p className="font-body text-[13px] text-red-500">{error}</p>}
          {message && <p className="font-body text-[13px] text-green-600">{message}</p>}
        </form>
      </div>
    </main>
  );
}
