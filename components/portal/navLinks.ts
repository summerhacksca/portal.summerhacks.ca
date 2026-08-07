/**
 * Nav data shared by the desktop header (PortalHeader) and the mobile sheet
 * (MobileNavSheet). Both render the same destinations, so they read them from
 * here rather than each keeping a copy that can drift.
 */

export const TABS = [
  { href: "/portal", label: "Home" },
  { href: "/portal/schedule", label: "Schedule" },
  { href: "/portal/trek", label: "Space Trek" },
  { href: "/portal/map", label: "Map" },
  { href: "/portal/profile", label: "Profile" },
];

export const DEVPOST_URL = "https://devpost.com"; // TODO: Update this URL
export const DISCORD_URL = "https://discord.gg/8DsFxnKSf";
export const DEMOGRAPHIC_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSe3eX0MpH-zZcT9VZObjf4Ye0jTz_1GdVSYTXxg_Zd_gPeFFg/viewform";

/** "Ada Lovelace" -> "AL", "Ada" -> "AD", "" -> "?". Used by the header avatar and the profile card. */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
