"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileNavSheet } from "./MobileNavSheet";
import { AGORIZE_URL, DISCORD_URL, initials, TABS } from "./navLinks";
import { NavPillGroup, navPillClass } from "./ui/NavPill";

/**
 * Two nav layouts, swapped at `lg`. The full bar needs roughly 810px of content
 * (logo ~150 + six pills ~420 + the two CTAs ~165 + avatar + gaps), so it
 * doesn't actually fit at `md`; below `lg` everything but the logo and avatar
 * moves into MobileNavSheet.
 */
export function PortalHeader({
  fullName,
  signedIn,
}: Readonly<{ fullName: string; signedIn: boolean }>) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-black/8 bg-sun-50/90 px-6 py-3.5 backdrop-blur-sm sm:px-9">
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

      <div className="hidden lg:block">
        <NavPillGroup>
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={navPillClass(pathname === tab.href)}
            >
              {tab.label}
            </Link>
          ))}
        </NavPillGroup>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        {/* TODO: Re-enable this when ready */}
        {/* <a
          href={AGORIZE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden h-9.5 items-center rounded-pill bg-base-900 px-4 font-display text-[13px] font-medium tracking-tight text-base-0 transition-opacity hover:opacity-80 lg:inline-flex"
        >
          Submit
        </a> */}
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden h-9.5 items-center rounded-pill bg-surface-pill px-4 font-display text-[13px] font-medium tracking-tight text-text-brand-accent transition-opacity hover:opacity-80 lg:inline-flex"
        >
          Discord
        </a>
        {signedIn && (
          <Link
            href="/portal/profile"
            className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full bg-terracotta font-display text-[13px] font-semibold text-white"
          >
            {initials(fullName)}
          </Link>
        )}
        <div className="lg:hidden">
          <MobileNavSheet signedIn={signedIn} />
        </div>
      </div>
    </header>
  );
}
