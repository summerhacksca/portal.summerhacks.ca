"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { UserRoleBadge } from "@/components/admin/UserRoleBadge";
import type { UserRole } from "@/lib/auth/roles";

export type NfcTag = {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  checkInUrl: string;
  qrDataUrl: string;
};

export function NfcTagList({ tags }: Readonly<{ tags: NfcTag[] }>) {
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tags;

    return tags.filter(
      (tag) =>
        tag.fullName.toLowerCase().includes(needle) || tag.email.toLowerCase().includes(needle),
    );
  }, [tags, query]);

  const handleCopy = async (tag: NfcTag) => {
    try {
      await navigator.clipboard.writeText(tag.checkInUrl);
      setCopiedId(tag.userId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy check-in URL:", error);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filter by name or email"
        aria-label="Filter by name or email"
        className="h-12 w-full max-w-105 rounded-sm border border-black/10 bg-sun-50 px-4 font-body text-[14px] text-base-800 outline-none transition focus:border-sun-300 focus:bg-white"
      />

      {filtered.length === 0 ? (
        <p className="font-body text-[14px] text-sun-400">
          {tags.length === 0 ? "No portal profiles yet." : `No matches for “${query.trim()}”.`}
        </p>
      ) : (
        <div className="overflow-hidden rounded-sm bg-surface-card shadow-card">
          {filtered.map((tag) => (
            <div
              key={tag.userId}
              className="flex flex-wrap items-center gap-4 border-t border-black/6 px-5 py-4 first:border-t-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image can't optimize it */}
              <img
                src={tag.qrDataUrl}
                alt={`Check-in QR code for ${tag.fullName || tag.email}`}
                width={64}
                height={64}
                className="h-16 w-16 shrink-0 rounded-sm bg-white"
              />

              <div className="flex min-w-45 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-[15px] font-medium tracking-tight text-base-800">
                    {tag.fullName || "Name not set"}
                  </span>
                  <UserRoleBadge role={tag.role} />
                </div>
                <span className="font-body text-[13px] text-sun-400">{tag.email}</span>
                <span className="break-all font-mono text-[11px] text-sun-400">
                  {tag.checkInUrl}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(tag)}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-pill bg-surface-pill px-4 font-display text-[13px] font-medium tracking-tight text-text-brand-accent transition-opacity hover:opacity-80"
              >
                {copiedId === tag.userId ? (
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
          ))}
        </div>
      )}
    </div>
  );
}
