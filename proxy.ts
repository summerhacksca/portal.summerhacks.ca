import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("sh_session");

  // Redirect unauthenticated users from /rsvp to /rsvp/login
  if (pathname === "/rsvp") {
    if (!sessionCookie?.value) {
      const loginUrl = new URL("/rsvp/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users from /rsvp/login to /rsvp
  if (pathname === "/rsvp/login") {
    if (sessionCookie?.value) {
      const rsvpUrl = new URL("/rsvp", request.url);
      return NextResponse.redirect(rsvpUrl);
    }
  }

  // Redirect unauthenticated users from /portal to /portal/login
  if (
    pathname === "/portal" ||
    (pathname.startsWith("/portal/") && pathname !== "/portal/login")
  ) {
    if (!sessionCookie?.value) {
      const loginUrl = new URL("/portal/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users from /portal/login to /portal
  if (pathname === "/portal/login") {
    if (sessionCookie?.value) {
      const portalUrl = new URL("/portal", request.url);
      return NextResponse.redirect(portalUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/rsvp", "/rsvp/(.*)", "/portal", "/portal/(.*)"],
};
