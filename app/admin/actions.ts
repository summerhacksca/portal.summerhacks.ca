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
 * entry point — re-check the role here, and write through the user-scoped
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
