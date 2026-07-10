import { createClient } from "@supabase/supabase-js";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");
	const tokenHash = searchParams.get("token_hash");
	const type = searchParams.get("type") as EmailOtpType | null;
	const next = searchParams.get("next") ?? "/rsvp";
	const safeNext = next.startsWith("/") ? next : "/rsvp";
	const origin = "https://portal.summerhacks.ca";

	// Use the regular supabase client (not SSR) for auth operations
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
	);

	let session = null;

	if (code) {
		const { data, error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) session = data.session;
	}

	if (!session && tokenHash && type) {
		const { data, error } = await supabase.auth.verifyOtp({
			type,
			token_hash: tokenHash,
		});
		if (!error) session = data.session;
	}

	if (!session) {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (user) {
			// Get the session from the stored session
			const { data: sessionData } = await supabase.auth.getSession();
			session = sessionData.session;
		}
	}

	const redirectUrl = session ? `${origin}${safeNext}` : `${origin}/rsvp/login`;
	const redirectResponse = NextResponse.redirect(redirectUrl);

	if (session) {
		// Set the Supabase auth cookie manually
		const projectRef = "hnnhlmemiicfrjhwwvni";
		const cookieName = `sb-${projectRef}-auth-token`;
		const cookieValue = JSON.stringify({
			access_token: session.access_token,
			refresh_token: session.refresh_token,
			expires_at: Math.floor(session.expires_at ?? Date.now() / 1000 + 3600),
			expires_in: session.expires_in ?? 3600,
			token_type: session.token_type ?? "bearer",
		});

		redirectResponse.cookies.set(cookieName, cookieValue, {
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			secure: true,
			maxAge: 60 * 60 * 24 * 365, // 1 year
		});
	}

	return redirectResponse;
}
