import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Only protect the exact /rsvp page. Allow /rsvp/login and /rsvp/api/* through.
	if (pathname === "/rsvp") {
		const sessionCookie = request.cookies.get("sh_session");
		if (!sessionCookie?.value) {
			const loginUrl = new URL("/rsvp/login", request.url);
			return NextResponse.redirect(loginUrl);
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/rsvp", "/rsvp/(.*)"],
};
