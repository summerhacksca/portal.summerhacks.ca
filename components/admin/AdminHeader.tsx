"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminMobileNavSheet } from "./AdminMobileNavSheet";
import { getAdminNavTabs, PORTAL_LINK } from "./adminNavLinks";

/**
 * Two nav layouts, swapped at `lg`. Below `lg` the pill links move into
 * AdminMobileNavSheet; the logo and hamburger stay in the sticky header.
 */
export function AdminHeader({
  canSeeOrganizerLinks,
}: Readonly<{ canSeeOrganizerLinks: boolean }>) {
  const pathname = usePathname();
  const tabs = getAdminNavTabs(canSeeOrganizerLinks);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-black/8 bg-sun-50/90 px-6 py-3.5 backdrop-blur-sm sm:px-9">
      <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
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
            Staff tools
          </span>
        </div>
      </Link>

      <nav className="hidden shrink-0 items-center gap-2.5 lg:flex">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-9.5 items-center rounded-pill px-4 font-display text-[13px] font-medium tracking-tight transition-opacity hover:opacity-80 ${
                active ? "bg-base-900 text-base-0" : "bg-surface-pill text-text-brand-accent"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
        <Link
          href={PORTAL_LINK.href}
          className="inline-flex h-9.5 items-center rounded-pill bg-base-900 px-4 font-display text-[13px] font-medium tracking-tight text-base-0 transition-opacity hover:opacity-80"
        >
          {PORTAL_LINK.label}
        </Link>
      </nav>

      <div className="flex shrink-0 items-center lg:hidden">
        <AdminMobileNavSheet canSeeOrganizerLinks={canSeeOrganizerLinks} />
      </div>
    </header>
  );
}
