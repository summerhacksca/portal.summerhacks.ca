import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
	try {
		const { email } = await request.json();

		if (!email || typeof email !== "string") {
			return NextResponse.json(
				{ error: "Email is required" },
				{ status: 400 },
			);
		}

		const normalizedEmail = email.trim().toLowerCase();

		const supabase = createAdminClient();

		const { error } = await supabase.auth.signInWithOtp({
			email: normalizedEmail,
			options: {
				emailRedirectTo: `${new URL(request.url).origin}/auth/confirm?next=/rsvp`,
			},
		});

		if (error) {
			console.error("Failed to send magic link:", error);
			return NextResponse.json(
				{ error: "Failed to send magic link" },
				{ status: 500 },
			);
		}

		return NextResponse.json(
			{ message: "Magic link sent! Check your email." },
			{ status: 200 },
		);
	} catch (error) {
		console.error("Send magic link error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
