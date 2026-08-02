"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function adminPageLabel(pathname: string): string | null {
  if (pathname === "/admin" || pathname === "/admin/") return null;

  if (pathname.startsWith("/admin/nfc-tags")) return "NFC tags";

  if (pathname.startsWith("/admin/trek")) return "The Third Space Trek";

  if (pathname.startsWith("/admin/checkin")) return "Check-in";

  const segment = pathname.replace(/^\/admin\/?/, "").split("/")[0];
  return segment ? segment.replaceAll("-", " ") : null;
}

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const label = adminPageLabel(pathname);

  if (!label) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 pt-6 pb-1 font-display text-[13px] tracking-tight"
    >
      <Link
        href="/admin"
        className="text-text-brand-accent transition-colors hover:text-orange"
      >
        Staff tools
      </Link>
      <ChevronRight aria-hidden className="size-3.5 shrink-0 text-sun-400" strokeWidth={2.25} />
      <span className="font-medium text-base-800">{label}</span>
    </nav>
  );
}
