export const USER_ROLES = ["user", "hacker", "volunteer", "organizer", "superadmin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

export function getRoleFromAppMetadata(
  appMetadata: Record<string, unknown> | undefined,
): UserRole {
  const role = appMetadata?.role;
  return isUserRole(role) ? role : "user";
}

export function canAccessPortal(role: UserRole): boolean {
  return (
    role === "hacker" || role === "volunteer" || role === "organizer" || role === "superadmin"
  );
}

export function canAccessAdmin(role: UserRole): boolean {
  return role === "volunteer" || role === "organizer" || role === "superadmin";
}

/** Organizer or superadmin: can reach /admin/trek, /admin/staff and /admin/announcements. */
export function canManageStaff(role: UserRole): boolean {
  return role === "organizer" || role === "superadmin";
}

export function isSuperadmin(role: UserRole): boolean {
  return role === "superadmin";
}

/**
 * Whether `viewer` may change `target`'s role from the /admin/staff UI.
 * Mirrors the rules enforced by public.admin_set_user_role() in
 * migrations/0012_staff_management.sql - kept in one place so the UI and the
 * database can't drift apart.
 */
export function canEditRole(
  viewer: { role: UserRole; userId: string },
  target: { role: UserRole; userId: string },
): boolean {
  if (!canManageStaff(viewer.role)) return false;
  if (viewer.userId === target.userId) return false;
  if (target.role === "superadmin") return false;
  if (target.role === "organizer" && !isSuperadmin(viewer.role)) return false;
  return true;
}

function base64UrlDecode(input: string): string {
  const base64 = input.replaceAll("-", "+").replaceAll("_", "/");
  if (typeof atob === "function") return atob(base64);
  return Buffer.from(base64, "base64").toString("utf8");
}

/** Read `app_metadata.role` from a Supabase access token (Edge-safe). */
export function getRoleFromAccessToken(accessToken: string): UserRole {
  try {
    const payloadPart = accessToken.split(".")[1];
    if (!payloadPart) return "user";

    const payload = JSON.parse(base64UrlDecode(payloadPart)) as {
      app_metadata?: { role?: unknown };
    };

    return getRoleFromAppMetadata(payload.app_metadata);
  } catch {
    return "user";
  }
}
