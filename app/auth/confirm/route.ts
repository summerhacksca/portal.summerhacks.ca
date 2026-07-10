import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");
	const tokenHash = searchParams.get("token_hash");
	const type = searchParams.get("type") as EmailOtpType | null;
	const next = searchParams.get("next") ?? "/rsvp";
	const safeNext = next.startsWith("/") ? next : "/rsvp";
	const origin = "https://portal.summerhacks.ca";
	const supabase = await createClient();

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			return NextResponse.redirect(`${origin}${safeNext}`);
		}
	}

	if (tokenHash && type) {
		const { error } = await supabase.auth.verifyOtp({
			type,
			token_hash: tokenHash,
		});
		if (!error) {
			return NextResponse.redirect(`${origin}${safeNext}`);
		}
	}

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		return NextResponse.redirect(`${origin}${safeNext}`);
	}

	return NextResponse.redirect(`${origin}/rsvp/login`);
}
