import { createClient } from "@supabase/supabase-js";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	console.log("[auth/confirm] received request", request.url);

	const { searchParams } = new URL(request.url);
	const tokenHash = searchParams.get("token_hash");
	const type = searchParams.get("type") as EmailOtpType | null;
	const next = searchParams.get("next") ?? "/rsvp";
	const safeNext = next.startsWith("/") ? next : "/rsvp";
	const origin = "https://portal.summerhacks.ca";

	console.log("[auth/confirm] params", { tokenHash: !!tokenHash, type, next: safeNext });

	// Use implicit flow so the magic link sends token_hash (not PKCE code)
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{ auth: { flowType: "implicit" } },
	);

	let session = null;

	// With implicit flow, the magic link delivers token_hash + type
	if (tokenHash && type) {
		console.log("[auth/confirm] trying verifyOtp");
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

	if (!session) {
		console.log("[auth/confirm] trying getSession fallback");
		const { data } = await supabase.auth.getSession();
		session = data.session;
		if (session) {
			console.log("[auth/confirm] getSession found user:", session.user?.email);
		}
	}

	console.log("[auth/confirm] session found:", !!session);
	console.log("[auth/confirm] redirecting to", session ? `${origin}${safeNext}` : `${origin}/rsvp/login`);

	const redirectUrl = session ? `${origin}${safeNext}` : `${origin}/rsvp/login`;
	const response = NextResponse.redirect(redirectUrl);

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
