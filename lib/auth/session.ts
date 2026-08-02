import type { Session } from "@supabase/supabase-js";

export const SH_SESSION_COOKIE = "sh_session";
export const SH_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type ShSession = {
  access_token: string;
  refresh_token: string;
  email?: string;
  user_id?: string;
};

export function serializeShSession(session: Session): string {
  return JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    email: session.user?.email,
    user_id: session.user?.id,
  } satisfies ShSession);
}

export function shSessionCookieOptions(secure: boolean) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    maxAge: SH_SESSION_MAX_AGE,
  };
}

export function parseShSession(cookieValue: string | undefined): ShSession | null {
  if (!cookieValue) return null;

  try {
    const parsed = JSON.parse(cookieValue) as Partial<ShSession>;
    if (!parsed.access_token) return null;
    return parsed as ShSession;
  } catch {
    return null;
  }
}
