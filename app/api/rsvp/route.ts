import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		// Read session from our custom cookie
		const sessionCookie = request.cookies.get("sh_session");
		if (!sessionCookie?.value) {
			return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
		}

		let cookieSession: { access_token?: string; email?: string; user_id?: string };
		try {
			cookieSession = JSON.parse(sessionCookie.value);
		} catch {
			return NextResponse.json({ error: "Invalid session" }, { status: 401 });
		}

		if (!cookieSession.access_token) {
			return NextResponse.json({ error: "Invalid session" }, { status: 401 });
		}

		// Verify the token is still valid with Supabase
		const supabase = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
			{
				global: {
					headers: {
						Authorization: `Bearer ${cookieSession.access_token}`,
					},
				},
			},
		);

		const { data: { user }, error: verifyError } = await supabase.auth.getUser();

		if (verifyError || !user) {
			console.error("Session verification failed:", verifyError?.message);
			return NextResponse.json(
				{ error: "Session expired or invalid. Please sign in again." },
				{ status: 401 },
			);
		}

		const body = await request.json();
		const participating = body.participating;
		const downtown = body.downtown;

		if (!participating || !downtown) {
			return NextResponse.json(
				{ error: "Both fields are required" },
				{ status: 400 },
			);
		}

		const adminClient = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!,
		);

		const { data: existing } = await adminClient
			.from("rsvp_submissions")
			.select("id")
			.eq("user_id", user.id)
			.maybeSingle();

		if (existing) {
			const { error: updateError } = await adminClient
				.from("rsvp_submissions")
				.update({
					participating,
					downtown,
					updated_at: new Date().toISOString(),
				})
				.eq("id", existing.id);

			if (updateError) {
				console.error("Failed to update RSVP:", updateError);
				return NextResponse.json(
					{ error: "Failed to update RSVP" },
					{ status: 500 },
				);
			}

			return NextResponse.json({ message: "RSVP updated" }, { status: 200 });
		}

		const { error: insertError } = await adminClient
			.from("rsvp_submissions")
			.insert({
				user_id: user.id,
				email: user.email ?? cookieSession.email ?? "",
				participating,
				downtown,
			});

		if (insertError) {
			console.error("Failed to save RSVP:", insertError);
			return NextResponse.json(
				{ error: "Failed to save RSVP" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ message: "RSVP saved" }, { status: 201 });
	} catch (error) {
		console.error("RSVP submit error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
