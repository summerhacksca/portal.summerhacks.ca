/**
 * The Third Space Trek - pure helpers and copy, shared by the server page and
 * the client countdowns. Deliberately free of "server-only" and of any clock
 * read: `trekState` takes `nowMs` as an argument, the same discipline as
 * pickUpNext() in ./schedule.ts, so it stays safe to call during render.
 */

/** Private Supabase Storage bucket. One folder per team, named by team slug. */
export const TREK_BUCKET = "scavenger-hunt";

const TIME_ZONE = "America/Toronto";

export type TrekStateInput = {
  isOpen: boolean;
  startsAt: string | null;
  endsAt: string | null;
  /** When this team may log its next photo. Null until they've logged one. */
  nextAllowedAt: string | null;
};

export type TrekStateKind = "before-start" | "open" | "cooldown" | "closed";

export type TrekState = {
  kind: TrekStateKind;
  /** Short label for the status pill. */
  label: string;
  /** One sentence explaining why the log form is closed. Empty when open. */
  detail: string;
  canSubmit: boolean;
};

function toMs(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Which of the four hunt states we're in. Order matters: closed beats
 * not-started beats cooldown, so a team still in cooldown at 11pm is told
 * standings are locked rather than "next photo in 4 minutes".
 *
 * The database enforces all of this again on insert - this only decides what
 * the page looks like.
 */
export function trekState(input: TrekStateInput, nowMs: number): TrekState {
  const startsMs = toMs(input.startsAt);
  const endsMs = toMs(input.endsAt);
  const nextMs = toMs(input.nextAllowedAt);

  if (startsMs === null || endsMs === null) {
    return {
      kind: "closed",
      label: "Not set up yet",
      detail: "The trek isn't set up yet - check back soon.",
      canSubmit: false,
    };
  }

  if (!input.isOpen || nowMs >= endsMs) {
    return {
      kind: "closed",
      label: "Standings locked",
      detail: "Standings are locked. Organizers are reviewing every photo.",
      canSubmit: false,
    };
  }

  if (nowMs < startsMs) {
    return {
      kind: "before-start",
      label: `Opens in ${formatCountdown(startsMs - nowMs)}`,
      detail: `The trek opens ${formatTrekTime(input.startsAt as string)}. Get your team together now - you can create or join before the start.`,
      canSubmit: false,
    };
  }

  if (nextMs !== null && nowMs < nextMs) {
    return {
      kind: "cooldown",
      label: `Next photo in ${formatCountdown(nextMs - nowMs)}`,
      detail: `Your team can log its next photo at ${formatTrekTime(input.nextAllowedAt as string)}.`,
      canSubmit: false,
    };
  }

  return {
    kind: "open",
    label: "Open - log a photo",
    detail: "",
    canSubmit: true,
  };
}

/**
 * `trekState` against the current clock. Kept in a plain helper - not inlined
 * into a component body - because it reads the current time
 * (react-hooks/purity), the same reason pickUpNext() lives in ./schedule.ts.
 * Client components pass the subscribed tick to `trekState` instead.
 */
export function currentTrekState(input: TrekStateInput): TrekState {
  return trekState(input, Date.now());
}

/** "41:12" under an hour, "2h 14m" above it. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatTrekTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  });
}

/**
 * Split date/time for a stamp caption - { date: "SAT AUG 8", time: "2:14 PM" }.
 * Two parts rather than one string so the stamp can set them on their own line
 * without splitting on a separator.
 */
export function formatStampMeta(iso: string): { date: string; time: string } {
  const at = new Date(iso);

  return {
    date: at
      .toLocaleString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: TIME_ZONE,
      })
      // "Sat, Aug 8" -> "SAT AUG 8" reads like an ink date stamp.
      .replace(/,/g, "")
      .toUpperCase(),
    time: at.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: TIME_ZONE,
    }),
  };
}

/** Value the location <select> uses for the free-text "somewhere else" option. */
export const CUSTOM_LOCATION_VALUE = "__custom__";

/** What a submission is worth, for the history list and the review page. */
export function pointsLabel(points: number): string {
  return points === 1 ? "+1 pt" : `+${points} pts`;
}

// ---------------------------------------------------------------------------
// Rules copy, straight from SummerHacks Scavenger Hunt.pdf. Hard-coded rather
// than seeded, following the FAQ_ITEMS / HELP_CONTACTS precedent in
// ./staticContent.ts - this text changes with the PDF, not with the database.
// ---------------------------------------------------------------------------

export const TREK_TAGLINE = "Work from somewhere new.";

export const TREK_INTRO =
  "Working the whole hackathon out of one room gets stale, and Toronto has a ton of good spaces to actually build in. Go explore the third spaces the city has to offer, starting from Stackt Marketplace.";

export const TREK_STEPS = [
  "Create a team here, or join one with a 6-character code from a teammate.",
  "Set up and work from any cool third space - there are suggestions below.",
  "Once an hour, snap a photo of your whole team working there - everyone in frame, lanyards visible - and log it on this page.",
  "Total points across the hackathon decide the leaderboard. You have all day to explore.",
];

export const TREK_SCORING = [
  {
    label: "A new spot",
    points: "2 pts",
    detail: "Anywhere on the list your team hasn't logged yet",
  },
  {
    label: "A repeat spot",
    points: "1 pt",
    detail: "Back at a spot your team has already logged",
  },
  {
    label: "Somewhere else",
    points: "1 pt",
    detail: "Off-list spots count, but never for the discovery bonus",
  },
  {
    label: "Cadence",
    points: "1 / hr",
    detail: "One scoring photo per hour, per team",
  },
];

export const TREK_GROUND_RULES = [
  "Respect the space and the people in it. Keep it down, don't hog tables during their rush, pack out what you bring.",
  "Most cafe spots require a small purchase to work in the space.",
  "This is a team win - all team members must appear in every photo, lanyards visible, or it won't count.",
  "Max one submitted photo per hour, per team.",
  "Organizers review every photo for validity after final standings are locked.",
];

export const TREK_PRIZE =
  "Top Explorer - one prize, awarded to the team with the highest verified point total on the leaderboard.";
