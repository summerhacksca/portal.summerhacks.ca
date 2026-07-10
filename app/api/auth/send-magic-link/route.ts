import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsrClient } from "@/lib/supabase/server";

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

		// Use admin client for DB lookup (bypasses RLS)
		const adminClient = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!,
		);

		// Check if the applicant exists and was accepted
		const { data: application, error: lookupError } = await adminClient
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

		// Use @supabase/ssr client — PKCE flow stores the verifier in a cookie
		// so the auth/confirm route can exchange the code for a session later.
		const supabase = await createSsrClient();

		const { error } = await supabase.auth.signInWithOtp({
			email: normalizedEmail,
			options: {
				emailRedirectTo: `https://portal.summerhacks.ca/auth/confirm`,
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
