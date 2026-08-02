"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavPillGroup, navPillClass } from "./ui/NavPill";

const TABS = [
  { href: "/portal", label: "Home" },
  { href: "/portal/schedule", label: "Schedule" },
  { href: "/portal/trek", label: "Space Trek" },
  { href: "/portal/map", label: "Map" },
  { href: "/portal/profile", label: "Profile" },
  { href: "/portal/help", label: "FAQ" },
];

// TODO: Update these URLs
const AGORIZE_URL = "https://agorize.com";
const DISCORD_URL = "https://discord.gg";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PortalHeader({ fullName }: Readonly<{ fullName: string }>) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-black/8 bg-sun-50/90 px-9 py-3.5 backdrop-blur-sm">
      <Link href="/portal" className="flex shrink-0 items-center gap-2.5">
        <Image
          src="/icon.svg"
          alt="SummerHacks"
          width={26}
          height={26}
          className="rounded-full"
        />
        <div className="flex flex-col leading-[1.15]">
          <span className="font-display text-[15px] font-semibold tracking-tighter text-base-800">
            SummerHacks
          </span>
          <span className="font-display text-[11px] font-medium tracking-tight text-sun-400">
            Hacker Portal
          </span>
        </div>
      </Link>

      <NavPillGroup>
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href} className={navPillClass(pathname === tab.href)}>
            {tab.label}
          </Link>
        ))}
      </NavPillGroup>

      <div className="flex shrink-0 items-center gap-2.5">
        <a
          href={AGORIZE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9.5 items-center rounded-pill bg-base-900 px-4 font-display text-[13px] font-medium tracking-tight text-base-0 transition-opacity hover:opacity-80"
        >
          Submit
        </a>
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9.5 items-center rounded-pill bg-surface-pill px-4 font-display text-[13px] font-medium tracking-tight text-text-brand-accent transition-opacity hover:opacity-80"
        >
          Discord
        </a>
        <Link
          href="/portal/profile"
          className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full bg-terracotta font-display text-[13px] font-semibold text-white"
        >
          {initials(fullName)}
        </Link>
      </div>
    </header>
  );
}
