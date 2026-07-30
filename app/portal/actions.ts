"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Update the signed-in hacker's editable profile fields. RLS scopes the write to their own row. */
export async function updateProfile(formData: FormData) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("Not authenticated");
	}

	const fullName = String(formData.get("full_name") ?? "").trim();
	const teamName = String(formData.get("team_name") ?? "").trim();
	const school = String(formData.get("school") ?? "").trim();
	const tracks = formData.getAll("tracks").map((t) => String(t));

	const { error } = await supabase
		.from("profiles")
		.update({
			full_name: fullName,
			team_name: teamName,
			school,
			tracks,
			updated_at: new Date().toISOString(),
		})
		.eq("user_id", user.id);

	if (error) {
		console.error("Failed to update profile:", error);
		throw new Error("Failed to update profile");
	}

	revalidatePath("/portal", "layout");
}

/** Flip the signed-in hacker's check-in status. */
export async function toggleCheckin() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("Not authenticated");
	}

	const { data: profile, error: readError } = await supabase
		.from("profiles")
		.select("checked_in")
		.eq("user_id", user.id)
		.maybeSingle();

	if (readError) {
		console.error("Failed to read check-in status:", readError);
		throw new Error("Failed to read check-in status");
	}

	const nextCheckedIn = !profile?.checked_in;

	const { error: updateError } = await supabase
		.from("profiles")
		.update({
			checked_in: nextCheckedIn,
			checked_in_at: nextCheckedIn ? new Date().toISOString() : null,
			updated_at: new Date().toISOString(),
		})
		.eq("user_id", user.id);

	if (updateError) {
		console.error("Failed to toggle check-in:", updateError);
		throw new Error("Failed to toggle check-in");
	}

	revalidatePath("/portal", "layout");
}
