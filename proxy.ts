import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  canAccessAdmin,
  canAccessPortal,
  canManageStaff,
  getRoleFromAppMetadata,
} from "@/lib/auth/roles";
import { mergeSupabaseResponse, updateSupabaseSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response: supabaseResponse, user } = await updateSupabaseSession(request);
  const redirect = (url: URL | string) =>
    mergeSupabaseResponse(supabaseResponse, NextResponse.redirect(url));

  const { pathname } = request.nextUrl;
  const isAuthenticated = !!user;
  const role = user ? getRoleFromAppMetadata(user.app_metadata) : null;

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

    if (!role || !canAccessPortal(role)) {
      const unauthorizedUrl = new URL("/portal/unauthorized", request.url);
      return redirect(unauthorizedUrl);
    }
  }

  if (isPortalLogin && isAuthenticated && role) {
    const destination = canAccessPortal(role) ? "/portal" : "/portal/unauthorized";
    return redirect(new URL(destination, request.url));
  }

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/portal/login", request.url);
      return redirect(loginUrl);
    }

    if (!role || !canAccessAdmin(role)) {
      const destination = role && canAccessPortal(role) ? "/portal" : "/portal/unauthorized";
      return redirect(new URL(destination, request.url));
    }

    const isOrganizerOnlyRoute =
      pathname === "/admin/walk-ins" ||
      pathname.startsWith("/admin/walk-ins/") ||
      pathname === "/admin/trek" ||
      pathname.startsWith("/admin/trek/") ||
      pathname === "/admin/staff" ||
      pathname.startsWith("/admin/staff/") ||
      pathname === "/admin/announcements" ||
      pathname.startsWith("/admin/announcements/");

    if (isOrganizerOnlyRoute && !canManageStaff(role)) {
      return redirect(new URL("/admin", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/rsvp", "/rsvp/(.*)", "/portal", "/portal/(.*)", "/admin", "/admin/(.*)"],
};
