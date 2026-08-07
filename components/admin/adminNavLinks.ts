/**
 * Nav data shared by the desktop header (AdminHeader) and the mobile sheet
 * (AdminMobileNavSheet). Both render the same destinations, so they read them
 * from here rather than each keeping a copy that can drift.
 */

export type AdminNavTab = {
  href: string;
  label: string;
};

export const ADMIN_TABS: AdminNavTab[] = [
  { href: "/admin/docs", label: "Guide" },
  { href: "/admin/nfc-tags", label: "NFC tags" },
];

export const ORGANIZER_TABS: AdminNavTab[] = [
  { href: "/admin/walk-ins", label: "Walk-ins" },
  { href: "/admin/trek", label: "Trek" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/announcements", label: "Announcements" },
];

export const PORTAL_LINK = { href: "/portal", label: "Portal" } as const;

export function getAdminNavTabs(canSeeOrganizerLinks: boolean): AdminNavTab[] {
  return canSeeOrganizerLinks ? [...ADMIN_TABS, ...ORGANIZER_TABS] : [...ADMIN_TABS];
}
