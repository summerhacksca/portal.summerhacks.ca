export const USER_ROLES = ["user", "hacker", "volunteer", "organizer"] as const;

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
  return role === "hacker" || role === "volunteer" || role === "organizer";
}

export function canAccessAdmin(role: UserRole): boolean {
  return role === "volunteer" || role === "organizer";
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
