import { createClient } from "@supabase/supabase-js";
import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	console.log("[auth/confirm] received request", request.url);

	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");
	const tokenHash = searchParams.get("token_hash");
	const type = searchParams.get("type") as EmailOtpType | null;

	console.log("[auth/confirm] params", { code: !!code, tokenHash: !!tokenHash, type });

	// Client for both implicit (token_hash) and PKCE (code) fallback
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{ auth: { flowType: "implicit" } },
	);

	let session = null;

	// Try PKCE flow first (code parameter)
	if (code) {
		console.log("[auth/confirm] trying exchangeCodeForSession (PKCE)");
		const { data, error } = await supabase.auth.exchangeCodeForSession(code);
		if (error) {
			console.log("[auth/confirm] exchangeCodeForSession error:", error.message);
		} else {
			console.log("[auth/confirm] exchangeCodeForSession success, user:", data.session?.user?.email);
			session = data.session;
		}
	}

	// Fall back to implicit flow (token_hash parameter)
	if (!session && tokenHash && type) {
		console.log("[auth/confirm] trying verifyOtp (implicit)");
		const { data, error } = await supabase.auth.verifyOtp({
			type,
			token_hash: tokenHash,
		});
		if (error) {
			console.log("[auth/confirm] verifyOtp error:", error.message);
		} else {
			console.log("[auth/confirm] verifyOtp success, user:", data.session?.user?.email);
			session = data.session;
		}
	}

	// Last-resort fallback
	if (!session) {
		console.log("[auth/confirm] trying getSession fallback");
		const { data } = await supabase.auth.getSession();
		session = data.session;
		if (session) {
			console.log("[auth/confirm] getSession found user:", session.user?.email);
		}
	}

	const origin = "https://portal.summerhacks.ca";
	const redirectTo = session ? `${origin}/rsvp` : `${origin}/rsvp/login`;
	console.log("[auth/confirm] session found:", !!session);
	console.log("[auth/confirm] redirecting to", redirectTo);

	const response = NextResponse.redirect(redirectTo);

	if (session) {
		const cookieValue = JSON.stringify({
			access_token: session.access_token,
			refresh_token: session.refresh_token,
			email: session.user?.email,
			user_id: session.user?.id,
		});
		console.log("[auth/confirm] setting sh_session cookie");
		response.cookies.set("sh_session", cookieValue, {
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			secure: true,
			maxAge: 60 * 60 * 24 * 7,
		});
	} else {
		console.log("[auth/confirm] no session, not setting cookie");
	}

	return response;
}
