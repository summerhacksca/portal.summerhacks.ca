"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { getAdminNavTabs, PORTAL_LINK } from "./adminNavLinks";

/**
 * Staff nav below `lg`, where the pill links no longer fit on one row. Same
 * mechanics as the hacker MobileNavSheet - kept mounted so it transitions,
 * Escape to close, body scroll locked while open, closes on navigation, and
 * portalled to document.body so backdrop-blur on the header doesn't clip the
 * fixed overlay.
 */
export function AdminMobileNavSheet({
  canSeeOrganizerLinks,
}: Readonly<{ canSeeOrganizerLinks: boolean }>) {
  const pathname = usePathname();
  const tabs = getAdminNavTabs(canSeeOrganizerLinks);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const setOpen = (next: boolean) => setOpenedAt(next ? pathname : null);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedAt(null);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open menu"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-base-800 transition-opacity hover:opacity-80"
      >
        <Menu size={22} aria-hidden />
      </button>

      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 transition-opacity duration-200 ${
              open ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <button
              type="button"
              tabIndex={open ? 0 : -1}
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute inset-0 h-full w-full cursor-default bg-black/40"
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-mobile-nav-title"
              className={`absolute inset-y-0 right-0 flex w-[min(320px,85vw)] flex-col gap-5 overflow-y-auto rounded-l-sm bg-surface-card px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] shadow-pop transition-transform duration-300 ease-out ${
                open ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <h2
                  id="admin-mobile-nav-title"
                  className="font-display text-xl font-medium tracking-tighter text-base-800"
                >
                  Menu
                </h2>
                <button
                  type="button"
                  tabIndex={open ? 0 : -1}
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface-pill text-text-brand-accent transition-opacity hover:opacity-80"
                >
                  <X size={18} aria-hidden />
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {tabs.map((tab) => {
                  const active = pathname === tab.href;
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      tabIndex={open ? 0 : -1}
                      aria-current={active ? "page" : undefined}
                      className={`flex h-12 items-center rounded-pill px-4 font-display text-[15px] font-medium tracking-tighter transition-opacity hover:opacity-80 ${
                        active ? "bg-base-900 text-base-0" : "text-base-800"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto border-t border-black/8 pt-5">
                <Link
                  href={PORTAL_LINK.href}
                  tabIndex={open ? 0 : -1}
                  className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-base-900 px-4 font-display text-[14px] font-medium tracking-tight text-base-0 transition-opacity hover:opacity-80"
                >
                  {PORTAL_LINK.label}
                </Link>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
