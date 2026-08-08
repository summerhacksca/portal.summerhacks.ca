"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { signOut } from "@/app/portal/actions";
import { DEVPOST_URL, DISCORD_URL, TABS } from "./navLinks";

/**
 * The portal nav below `lg`, where the six tabs plus the two CTAs no longer fit
 * on one row. Same mechanics as TrekPanel - kept mounted so it transitions,
 * Escape to close, body scroll locked while open - with two additions it needs
 * and TrekPanel doesn't:
 *
 * - Closing itself on navigation, or it would sit open over whichever page you
 *   just tapped through to.
 * - Portalling the overlay to document.body. PortalHeader has backdrop-blur,
 *   and a `backdrop-filter` ancestor creates a containing block for
 *   `position: fixed` descendants - without the portal, "fixed inset-0" here
 *   resolves against the header's own (short) box instead of the viewport, so
 *   the sheet renders clipped to header height. TrekPanel doesn't need this;
 *   nothing in its ancestor chain has a filter.
 */
export function MobileNavSheet({ signedIn }: Readonly<{ signedIn: boolean }>) {
  const pathname = usePathname();
  // Storing the route the sheet was opened on, rather than a plain boolean,
  // makes "closed" fall out of the next render whenever the route changes -
  // no effect, and browser back/forward is covered as well as tapping a tab.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const setOpen = (next: boolean) => setOpenedAt(next ? pathname : null);

  // document.body isn't available during SSR. Same trick CheckinPanel uses
  // for its client-only localStorage read: useSyncExternalStore's server
  // snapshot (false) renders nothing, then React itself flips to the client
  // snapshot (true) post-hydration - no setState-in-effect required.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      // setOpenedAt directly, not the setOpen wrapper: state setters are
      // stable, so the effect keeps a single dependency.
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
          // Kept mounted so the panel can transition rather than pop in.
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
              aria-labelledby="mobile-nav-title"
              className={`absolute inset-y-0 right-0 flex w-[min(320px,85vw)] flex-col gap-5 overflow-y-auto rounded-l-sm bg-surface-card px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] shadow-pop transition-transform duration-300 ease-out ${
                open ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <h2
                  id="mobile-nav-title"
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
                {TABS.map((tab) => {
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

              <div className="flex flex-col gap-2.5 border-t border-black/8 pt-5">
                {/* TODO: Re-enable this when ready */}
                <a
                  href={"https://summerhacksca.devpost.com/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={open ? 0 : -1}
                  className="inline-flex h-12 items-center justify-center rounded-pill bg-base-900 px-4 font-display text-[14px] font-medium tracking-tight text-base-0 transition-opacity hover:opacity-80"
                >
                  Submit
                </a>
                <a
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={open ? 0 : -1}
                  className="inline-flex h-12 items-center justify-center rounded-pill bg-surface-pill px-4 font-display text-[14px] font-medium tracking-tight text-text-brand-accent transition-opacity hover:opacity-80"
                >
                  Discord
                </a>
              </div>

              {/* The portal layout also wraps /portal/login and /portal/unauthorized,
							    so this sheet renders for signed-out visitors too. */}
              {signedIn && (
                <form action={signOut} className="mt-auto pt-5">
                  <button
                    type="submit"
                    tabIndex={open ? 0 : -1}
                    className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-surface-pill px-6 font-display text-[14px] font-medium tracking-tight text-terracotta transition-opacity hover:opacity-80"
                  >
                    Sign out
                  </button>
                </form>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
