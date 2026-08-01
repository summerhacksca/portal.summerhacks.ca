"use server";

import { revalidatePath } from "next/cache";
import { canAccessAdmin, getRoleFromAppMetadata } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type CheckinResult = {
	success: boolean;
	message: string;
};

/**
 * proxy.ts already blocks non-staff from /admin, but the actions are their own
 * entry point - re-check the role here, and write through the user-scoped
 * client so the `can_access_admin()` RLS policy is the real enforcement.
 */
async function requireStaff() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("Not authenticated");
	}

	if (!canAccessAdmin(getRoleFromAppMetadata(user.app_metadata))) {
		throw new Error("Volunteer or organizer access required");
	}

	return { supabase, user };
}

/** Check a hacker into an event by their scanned tag ID. */
export async function checkInUser(nfcId: string, eventId: string): Promise<CheckinResult> {
	const { supabase, user } = await requireStaff();

	const { data: profile } = await supabase
		.from("profiles")
		.select("user_id")
		.eq("nfc_id", nfcId)
		.maybeSingle();

	if (!profile) {
		return { success: false, message: "No hacker found for this tag." };
	}

	const now = new Date().toISOString();

	// The unique (event_id, user_id) index makes this idempotent, so a
	// double-scan re-stamps the row instead of erroring.
	const { error } = await supabase.from("event_checkins").upsert(
		{
			event_id: eventId,
			user_id: profile.user_id,
			checked_in: true,
			checked_in_at: now,
			checked_in_by: user.id,
			updated_at: now,
		},
		{ onConflict: "event_id,user_id" },
	);

	if (error) {
		console.error("Failed to check in user:", error);
		// Surfaces the DB trigger's message when the event isn't a meal or registration.
		return { success: false, message: error.message };
	}

	revalidatePath("/admin", "layout");
	revalidatePath("/portal", "layout");

	return { success: true, message: "Checked in." };
}

/** Undo a check-in. Keeps the row so the audit trail survives. */
export async function uncheckInUser(nfcId: string, eventId: string): Promise<CheckinResult> {
	const { supabase } = await requireStaff();

	const { data: profile } = await supabase
		.from("profiles")
		.select("user_id")
		.eq("nfc_id", nfcId)
		.maybeSingle();

	if (!profile) {
		return { success: false, message: "No hacker found for this tag." };
	}

	const { error } = await supabase
		.from("event_checkins")
		.update({ checked_in: false, updated_at: new Date().toISOString() })
		.eq("event_id", eventId)
		.eq("user_id", profile.user_id);

	if (error) {
		console.error("Failed to undo check-in:", error);
		return { success: false, message: error.message };
	}

	revalidatePath("/admin", "layout");
	revalidatePath("/portal", "layout");

	return { success: true, message: "Check-in undone." };
}

/**
 * Approve or reject a logged Third Space Trek photo.
 *
 * Rejecting is all it takes: points are derived by a window function rather
 * than stored, so the rejected photo's points disappear AND the 2pt discovery
 * bonus re-flows onto that team's next surviving photo at the same spot. There
 * is nothing to recompute here.
 */
export async function reviewTrekSubmission(
	submissionId: string,
	status: "approved" | "rejected",
	note: string,
): Promise<CheckinResult> {
	const { supabase, user } = await requireStaff();

	const { error } = await supabase
		.from("scavenger_submissions")
		.update({
			status,
			review_note: note.trim(),
			reviewed_by: user.id,
			reviewed_at: new Date().toISOString(),
		})
		.eq("id", submissionId);

	if (error) {
		console.error("Failed to review trek submission:", error);
		return { success: false, message: error.message };
	}

	revalidatePath("/admin", "layout");
	revalidatePath("/portal", "layout");

	return {
		success: true,
		message: status === "approved" ? "Approved." : "Rejected - points removed.",
	};
}

/** Open, close or reschedule the trek. The RPC re-checks the staff role. */
export async function updateTrekSettings(formData: FormData): Promise<CheckinResult> {
	const { supabase } = await requireStaff();

	const { error } = await supabase.rpc("scavenger_update_settings", {
		// Raw <input type="datetime-local"> strings. The RPC reads them as
		// Toronto wall-clock time - this project has no date library.
		p_starts_local: String(formData.get("starts_at") ?? ""),
		p_ends_local: String(formData.get("ends_at") ?? ""),
		p_is_open: formData.get("is_open") === "on",
		p_cooldown_minutes: Number(formData.get("cooldown_minutes") ?? 60),
		p_max_team_size: Number(formData.get("max_team_size") ?? 4),
		p_new_spot_points: Number(formData.get("new_spot_points") ?? 2),
		p_repeat_spot_points: Number(formData.get("repeat_spot_points") ?? 1),
	});

	if (error) {
		console.error("Failed to update trek settings:", error);
		return { success: false, message: error.message };
	}

	revalidatePath("/admin", "layout");
	revalidatePath("/portal", "layout");

	return { success: true, message: "Settings saved." };
}
