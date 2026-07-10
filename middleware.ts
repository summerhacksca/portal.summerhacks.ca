import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Redirect unauthenticated users from /rsvp to /rsvp/login
	if (pathname === "/rsvp") {
		const sessionCookie = request.cookies.get("sh_session");

		if (!sessionCookie?.value) {
			const loginUrl = new URL("/rsvp/login", request.url);
			return NextResponse.redirect(loginUrl);
		}
	}

	// Redirect authenticated users from /rsvp/login to /rsvp
	if (pathname === "/rsvp/login") {
		const sessionCookie = request.cookies.get("sh_session");

		if (sessionCookie?.value) {
			const rsvpUrl = new URL("/rsvp", request.url);
			return NextResponse.redirect(rsvpUrl);
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/rsvp", "/rsvp/(.*)"],
};
