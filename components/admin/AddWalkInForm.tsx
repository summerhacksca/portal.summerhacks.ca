"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { addWalkInHacker } from "@/app/admin/actions";
import type { WalkInResult } from "@/app/admin/actions";

const inputClass =
  "h-11 w-full rounded-sm border border-black/10 bg-sun-50 px-4 text-[14px] text-base-800 outline-none transition focus:border-sun-300 focus:bg-white";

const labelClass = "font-display text-[13px] font-semibold tracking-tight text-base-800";

/**
 * Registers a hacker who showed up on the day without applying. One email is
 * all addWalkInHacker() needs - it creates the account, makes them a hacker,
 * files an RSVP and comes back with their permanent check-in URL, so the desk
 * can write their tag and check them into registration from right here.
 */
export function AddWalkInForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<WalkInResult | null>(null);
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Only failures time out. A success carries the check-in URL, and pulling
  // that out from under someone mid-scan would mean re-submitting to get it
  // back - it stays until the next walk-in is added.
  useEffect(() => {
    if (!result || result.success) return;
    const timer = setTimeout(() => setResult(null), 5000);
    return () => clearTimeout(timer);
  }, [result]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const actionResult = await addWalkInHacker(formData);
      setResult(actionResult);
      setCopied(false);
      if (actionResult.success) formRef.current?.reset();
    });
  }

  // Pulled out of the JSX so the copy handler below gets a plain string:
  // TypeScript drops property narrowing inside a callback, and this reads
  // better than asserting result.checkInUrl is set a second time.
  const checkIn =
    result?.success && result.checkInUrl && result.qrDataUrl
      ? { url: result.checkInUrl, qrDataUrl: result.qrDataUrl }
      : null;

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy check-in URL:", error);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-sm bg-surface-card p-5 shadow-card sm:p-7"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="name@uwaterloo.ca"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="full_name" className={labelClass}>
            Full name <span className="font-normal text-sun-400">(optional)</span>
          </label>
          <input id="full_name" name="full_name" type="text" className={inputClass} />
        </div>
      </div>

      {result && (
        <p
          className="rounded-sm px-4 py-3 font-body text-[13px]"
          style={{
            background: result.success ? "rgba(143,194,0,0.12)" : "rgba(189,60,60,0.1)",
            color: result.success ? "var(--base-800)" : "var(--terracotta)",
          }}
        >
          {result.message}
        </p>
      )}

      {checkIn && (
        <div className="flex flex-wrap items-center gap-4 rounded-sm border border-black/6 bg-sun-50 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image can't optimize it */}
          <img
            src={checkIn.qrDataUrl}
            alt="Check-in QR code for the walk-in just added"
            width={96}
            height={96}
            className="h-24 w-24 shrink-0 rounded-sm bg-white"
          />

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-display text-[13px] font-semibold tracking-tight text-base-800">
              Their check-in URL
            </span>
            <span className="break-all font-mono text-[11px] text-sun-400">{checkIn.url}</span>
            <Link
              href={checkIn.url}
              className="font-display text-[13px] font-medium tracking-tight text-text-brand-accent transition-colors hover:text-orange"
            >
              Open check-in page →
            </Link>
          </div>

          <button
            type="button"
            onClick={() => handleCopy(checkIn.url)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-pill bg-surface-pill px-4 font-display text-[13px] font-medium tracking-tight text-text-brand-accent transition-opacity hover:opacity-80"
          >
            {copied ? (
              <>
                <Check size={15} />
                Copied
              </>
            ) : (
              <>
                <Copy size={15} />
                Copy URL
              </>
            )}
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-11 w-fit items-center justify-center rounded-pill bg-base-900 px-6 font-display text-[13px] font-medium tracking-tight text-base-0 transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {isPending ? "Registering…" : "Register walk-in"}
      </button>
    </form>
  );
}
