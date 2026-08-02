import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  canAccessAdmin,
  canAccessPortal,
  canManageStaff,
  getRoleFromAccessToken,
} from "@/lib/auth/roles";
import { parseShSession } from "@/lib/auth/session";
import { mergeSupabaseResponse, updateSupabaseSession } from "@/lib/supabase/proxy";

function getSessionRole(request: NextRequest) {
  const session = parseShSession(request.cookies.get("sh_session")?.value);
  if (!session) return { session: null, role: null };

  return {
    session,
    role: getRoleFromAccessToken(session.access_token),
  };
}

export async function proxy(request: NextRequest) {
  const supabaseResponse = await updateSupabaseSession(request);
  const redirect = (url: URL | string) =>
    mergeSupabaseResponse(supabaseResponse, NextResponse.redirect(url));

  const { pathname } = request.nextUrl;
  const { session, role } = getSessionRole(request);
  const isAuthenticated = !!session;

  // Redirect unauthenticated users from /rsvp to /rsvp/login
  if (pathname === "/rsvp") {
    if (!isAuthenticated) {
      const loginUrl = new URL("/rsvp/login", request.url);
      return redirect(loginUrl);
    }
  }

  // Redirect authenticated users from /rsvp/login to /rsvp
  if (pathname === "/rsvp/login") {
    if (isAuthenticated) {
      const rsvpUrl = new URL("/rsvp", request.url);
      return redirect(rsvpUrl);
    }
  }

  const isPortalLogin = pathname === "/portal/login";
  const isPortalUnauthorized = pathname === "/portal/unauthorized";
  const isPortalRoute =
    pathname === "/portal" ||
    (pathname.startsWith("/portal/") && !isPortalLogin && !isPortalUnauthorized);

  if (isPortalRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/portal/login", request.url);
      return redirect(loginUrl);
    }

    if (!canAccessPortal(role!)) {
      const unauthorizedUrl = new URL("/portal/unauthorized", request.url);
      return redirect(unauthorizedUrl);
    }
  }

  if (isPortalLogin && isAuthenticated) {
    const destination = canAccessPortal(role!) ? "/portal" : "/portal/unauthorized";
    return redirect(new URL(destination, request.url));
  }

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/portal/login", request.url);
      return redirect(loginUrl);
    }

    if (!canAccessAdmin(role!)) {
      const destination = canAccessPortal(role!) ? "/portal" : "/portal/unauthorized";
      return redirect(new URL(destination, request.url));
    }

    const isOrganizerOnlyRoute =
      pathname === "/admin/trek" ||
      pathname.startsWith("/admin/trek/") ||
      pathname === "/admin/staff" ||
      pathname.startsWith("/admin/staff/") ||
      pathname === "/admin/announcements" ||
      pathname.startsWith("/admin/announcements/");

    if (isOrganizerOnlyRoute && !canManageStaff(role!)) {
      return redirect(new URL("/admin", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/rsvp", "/rsvp/(.*)", "/portal", "/portal/(.*)", "/admin", "/admin/(.*)"],
};
