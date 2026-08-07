"use client";

import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { DEMOGRAPHIC_FORM_URL } from "./navLinks";
import { OrangeGlyph } from "./ui/icons";

const DISMISSED_KEY = "sh_demographic_banner_dismissed";

function readDismissed() {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    // sessionStorage can throw in Safari private mode / with storage blocked.
    // Failing "not dismissed" just means the banner shows every time, not a crash.
    return false;
  }
}

/**
 * Below-navbar strip pointing signed-in hackers at the anonymous demographic
 * survey. Lives in app/portal/layout.tsx, gated on `signedIn` there.
 *
 * Dismissal persists for the tab's session (sessionStorage), same as the
 * localStorage idiom in CheckinPanel: useSyncExternalStore's server snapshot
 * renders nothing so there's no SSR/client mismatch, and a plain `dismissedNow`
 * state covers the same-tab write, since the `storage` event only fires for
 * *other* tabs.
 */
export function DemographicBanner() {
  const storedDismissed = useSyncExternalStore(
    () => () => {},
    readDismissed,
    () => true,
  );
  const [dismissedNow, setDismissedNow] = useState(false);

  if (storedDismissed || dismissedNow) return null;

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Best-effort persistence; the in-memory dismiss below still applies
      // for the rest of this page's lifetime either way.
    }
    setDismissedNow(true);
  };

  return (
    <div
      role="region"
      aria-label="Announcement"
      className="border-b border-black/8 bg-surface-card"
      style={{ borderLeft: "3px solid var(--orange)" }}
    >
      <div className="mx-auto flex w-full max-w-[1160px] flex-wrap items-center gap-3 px-6 py-3 sm:px-9">
        <OrangeGlyph size={20} />
        <p className="font-body text-[13px] text-base-800 sm:text-[14px]">
          Help us make SummerHacks better! Take our 2-minute anonymous demographic survey.
        </p>
        <a
          href={DEMOGRAPHIC_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex h-9.5 items-center rounded-pill bg-base-900 px-4 font-display text-[13px] font-medium tracking-tight text-base-0 transition-opacity hover:opacity-80"
        >
          Take survey
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-text-brand-accent transition-opacity hover:opacity-80"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
