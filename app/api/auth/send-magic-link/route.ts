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

		// Check if the applicant exists and was accepted
		const { data: application, error: lookupError } = await supabase
			.from("application_submissions")
			.select("id, status")
			.eq("applicant_email", normalizedEmail)
			.maybeSingle();

		if (lookupError) {
			console.error("Failed to look up applicant:", lookupError);
			return NextResponse.json(
				{ error: "Failed to verify applicant" },
				{ status: 500 },
			);
		}

		if (!application) {
			return NextResponse.json(
				{ error: "No application found for this email." },
				{ status: 403 },
			);
		}

		if (application.status !== "accepted") {
			return NextResponse.json(
				{ error: "Your application has not been accepted yet." },
				{ status: 403 },
			);
		}

		const { error } = await supabase.auth.signInWithOtp({
			email: normalizedEmail,
			options: {
				emailRedirectTo: `https://portal.summerhacks.ca/auth/confirm?next=/rsvp`,
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
