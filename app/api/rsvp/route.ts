import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user?.email) {
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

		const adminClient = createAdminClient();

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
				email: user.email,
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
