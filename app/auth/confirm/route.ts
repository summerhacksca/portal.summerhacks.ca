import { createServerClient } from "@supabase/ssr";
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

	// Collect cookies to set through the redirect response
	const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = [];

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.headers.has("cookie")
						? request.headers.get("cookie")!.split(";").map((c) => {
								const [name, ...rest] = c.trim().split("=");
								return { name, value: rest.join("=") };
							})
						: [];
				},
				setAll(cookies) {
					for (const { name, value, options } of cookies) {
						cookiesToSet.push({ name, value, options: options ?? {} });
					}
				},
			},
		},
	);

	let authenticated = false;

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) authenticated = true;
	}

	if (!authenticated && tokenHash && type) {
		const { error } = await supabase.auth.verifyOtp({
			type,
			token_hash: tokenHash,
		});
		if (!error) authenticated = true;
	}

	if (!authenticated) {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (user) authenticated = true;
	}

	const redirectUrl = authenticated ? `${origin}${safeNext}` : `${origin}/rsvp/login`;
	const response = NextResponse.redirect(redirectUrl);

	// Apply cookies that the auth calls wanted to set
	for (const { name, value, options } of cookiesToSet) {
		response.cookies.set(name, value, {
			path: options.path as string ?? "/",
			httpOnly: options.httpOnly as boolean ?? true,
			sameSite: (options.sameSite as "lax" | "strict" | "none") ?? "lax",
			secure: options.secure as boolean ?? true,
			maxAge: options.maxAge as number ?? 60 * 60 * 24 * 365,
		});
	}

	return response;
}
