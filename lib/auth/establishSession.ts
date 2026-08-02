import "server-only";
import type { Session } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { canAccessPortal, getRoleFromAppMetadata } from "@/lib/auth/roles";
import { getSiteUrl } from "@/lib/portal/siteUrl";

const SESSION_COOKIE = "sh_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/** Where a freshly signed-in user belongs, based on the role in their token. */
export function destinationForSession(session: Session): string {
  const role = getRoleFromAppMetadata(session.user.app_metadata);
  return canAccessPortal(role) ? "/portal" : "/portal/unauthorized";
}

/**
 * Writes the `sh_session` cookie that proxy.ts and /api/rsvp read, and returns
 * the path to send the user to.
 *
 * The Supabase auth cookies that server components read via `getUser()` are
 * written separately, by the @supabase/ssr client that performed the
 * verification - so callers must use `lib/supabase/server.ts` and must run in a
 * Route Handler or Server Action, the only places cookie writes are allowed.
 */
export async function establishSession(session: Session): Promise<string> {
  const cookieStore = await cookies();

  cookieStore.set(
    SESSION_COOKIE,
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      email: session.user?.email,
      user_id: session.user?.id,
    }),
    {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: getSiteUrl().startsWith("https://"),
      maxAge: SESSION_MAX_AGE,
    },
  );

  return destinationForSession(session);
}
