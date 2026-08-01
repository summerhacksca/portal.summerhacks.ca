import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Staff · SummerHacks",
  description: "Check-in and tag provisioning for volunteers and organizers",
};

export const dynamic = "force-dynamic";

/**
 * Staff-only shell. Access is enforced in proxy.ts (`canAccessAdmin`) and again
 * by the `can_access_admin()` RLS policies, so there is no auth check here.
 */
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-page">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-black/8 bg-sun-50/90 px-6 py-3.5 backdrop-blur-sm sm:px-9">
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

        <nav className="flex shrink-0 items-center gap-2.5">
          <Link
            href="/admin/nfc-tags"
            className="inline-flex h-9.5 items-center rounded-pill bg-surface-pill px-4 font-display text-[13px] font-medium tracking-tight text-text-brand-accent transition-opacity hover:opacity-80"
          >
            NFC tags
          </Link>
          <Link
            href="/admin/trek"
            className="inline-flex h-9.5 items-center rounded-pill bg-surface-pill px-4 font-display text-[13px] font-medium tracking-tight text-text-brand-accent transition-opacity hover:opacity-80"
          >
            Trek
          </Link>
          <Link
            href="/portal"
            className="inline-flex h-9.5 items-center rounded-pill bg-base-900 px-4 font-display text-[13px] font-medium tracking-tight text-base-0 transition-opacity hover:opacity-80"
          >
            Portal
          </Link>
        </nav>
      </header>
      <div className="mx-auto w-full max-w-290 px-6 sm:px-9">
        <AdminBreadcrumb />
      </div>
      {children}
    </div>
  );
}
