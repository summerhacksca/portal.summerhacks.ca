/**
 * Announcement accent presets - pure constants, no server-only, so both the
 * admin composer (client) and the create action (server) can import them.
 * Same pairing idea as lib/portal/eventTypes.ts: a CSS value for the portal
 * render and a literal Discord hex, because Discord embeds can't resolve CSS
 * custom properties.
 *
 * "normal" and "urgent" are the exact strings already seeded in
 * migrations/0002_portal_tables.sql, and app/portal/page.tsx special-cases
 * `var(--orange)` for the tinted card background - keep these values in sync
 * with both if they ever change.
 */
export const ANNOUNCEMENT_ACCENTS = [
  { key: "normal", label: "Normal", css: "rgba(42,42,42,0.1)", discord: 0x2a2a2a },
  { key: "urgent", label: "Urgent", css: "var(--orange)", discord: 0xff8800 },
  { key: "info", label: "Info", css: "var(--blue)", discord: 0x477eff },
] as const;

export type AnnouncementAccentKey = (typeof ANNOUNCEMENT_ACCENTS)[number]["key"];

const CSS_BY_KEY = new Map<AnnouncementAccentKey, string>(
  ANNOUNCEMENT_ACCENTS.map((accent) => [accent.key, accent.css]),
);
// Keyed by plain string, not the literal union: accent values round-trip
// through the announcements table as free-form text.
const DISCORD_BY_CSS = new Map<string, number>(
  ANNOUNCEMENT_ACCENTS.map((accent) => [accent.css, accent.discord]),
);

export function isAnnouncementAccentKey(value: unknown): value is AnnouncementAccentKey {
  return typeof value === "string" && CSS_BY_KEY.has(value as AnnouncementAccentKey);
}

/** Accent key (from the composer's <select>) → the CSS value stored on the row. */
export function accentCssForKey(key: AnnouncementAccentKey): string {
  return CSS_BY_KEY.get(key) ?? ANNOUNCEMENT_ACCENTS[0].css;
}

/** CSS value (from an announcements row) → the literal Discord hex, for the embed. */
export function discordColorForCss(css: string): number {
  return DISCORD_BY_CSS.get(css) ?? ANNOUNCEMENT_ACCENTS[0].discord;
}
