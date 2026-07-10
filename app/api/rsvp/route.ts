import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/** Helper: verify session cookie and return the authenticated user */
async function verifySession(request: NextRequest) {
	const sessionCookie = request.cookies.get("sh_session");
	if (!sessionCookie?.value) return null;

	let cookieSession: { access_token?: string };
	try {
		cookieSession = JSON.parse(sessionCookie.value);
	} catch {
		return null;
	}

	if (!cookieSession.access_token) return null;

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

	const { data: { user }, error } = await supabase.auth.getUser();
	if (error || !user) return null;
	return user;
}

/** GET /api/rsvp — fetch the authenticated user's existing RSVP (if any) */
export async function GET(request: NextRequest) {
	const user = await verifySession(request);
	if (!user) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const adminClient = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
	);

	const { data, error } = await adminClient
		.from("rsvp_submissions")
		.select("participating, downtown")
		.eq("user_id", user.id)
		.maybeSingle();

	if (error) {
		console.error("Failed to fetch RSVP:", error);
		return NextResponse.json({ rsvp: null }, { status: 200 });
	}

	return NextResponse.json({ rsvp: data ?? null }, { status: 200 });
}

/** POST /api/rsvp — create or update the authenticated user's RSVP */
export async function POST(request: NextRequest) {
	try {
		const user = await verifySession(request);
		if (!user) {
			return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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
				email: user.email ?? "",
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
