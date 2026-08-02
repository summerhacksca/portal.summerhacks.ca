import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  SH_SESSION_COOKIE,
  serializeShSession,
  shSessionCookieOptions,
} from "@/lib/auth/session";

export type SupabaseSessionUpdate = {
  response: NextResponse;
  user: User | null;
};

/**
 * Refreshes the Supabase auth session and returns a `NextResponse` with any
 * updated auth cookies. Must run in proxy.ts - Server Components cannot write
 * cookies when `getUser()` triggers a token refresh.
 *
 * Also keeps `sh_session` in sync with the validated Supabase session, or
 * clears it when the session is no longer valid (expired/revoked tokens).
 */
export async function updateSupabaseSession(
  request: NextRequest,
): Promise<SupabaseSessionUpdate> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hasShSession = request.cookies.has(SH_SESSION_COOKIE);
  const secure =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";

  if (user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      supabaseResponse.cookies.set(
        SH_SESSION_COOKIE,
        serializeShSession(session),
        shSessionCookieOptions(secure),
      );
    }
  } else if (hasShSession) {
    supabaseResponse.cookies.set(SH_SESSION_COOKIE, "", {
      ...shSessionCookieOptions(secure),
      maxAge: 0,
    });
  }

  return { response: supabaseResponse, user };
}

/** Copies Supabase session cookies/headers onto another response (e.g. redirects). */
export function mergeSupabaseResponse(from: NextResponse, to: NextResponse): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  from.headers.forEach((value, key) => {
    to.headers.set(key, value);
  });
  return to;
}
