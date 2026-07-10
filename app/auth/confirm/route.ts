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

	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
	);

	let session = null;

	if (code) {
		const { data, error } = await supabase.auth.exchangeCodeForSession(code);
		console.log("[auth/confirm] exchangeCodeForSession", error ? `error: ${error.message}` : "success");
		if (!error) session = data.session;
	}

	if (!session && tokenHash && type) {
		const { data, error } = await supabase.auth.verifyOtp({
			type,
			token_hash: tokenHash,
		});
		console.log("[auth/confirm] verifyOtp", error ? `error: ${error.message}` : "success");
		if (!error) session = data.session;
	}

	if (!session) {
		const { data } = await supabase.auth.getSession();
		session = data.session;
	}

	console.log("[auth/confirm] session found:", !!session);

	const redirectUrl = session ? `${origin}${safeNext}` : `${origin}/rsvp/login`;
	const response = NextResponse.redirect(redirectUrl);

	if (session) {
		response.cookies.set("sh_session", JSON.stringify({
			access_token: session.access_token,
			refresh_token: session.refresh_token,
			email: session.user?.email,
			user_id: session.user?.id,
		}), {
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			secure: true,
			maxAge: 60 * 60 * 24 * 7, // 7 days
		});
	}

	return response;
}
