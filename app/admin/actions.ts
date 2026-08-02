"use server";

import { revalidatePath } from "next/cache";
import { findAuthUserByEmail } from "@/lib/auth/findAuthUser";
import {
  canAccessAdmin,
  canManageStaff,
  getRoleFromAppMetadata,
  isSuperadmin,
  isUserRole,
} from "@/lib/auth/roles";
import type { UserRole } from "@/lib/auth/roles";
import { getDiscordWebhookUrl, postToDiscord } from "@/lib/discord/webhook";
import {
  accentCssForKey,
  discordColorForCss,
  isAnnouncementAccentKey,
} from "@/lib/portal/announcementAccents";
import { activeCheckinEvents } from "@/lib/portal/checkinWindow";
import { getCheckinEvents } from "@/lib/portal/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CheckinResult = {
  success: boolean;
  message: string;
};

export type AutoCheckinResult = CheckinResult & {
  eventId: string | null;
  eventTitle: string | null;
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

/**
 * Staff management and announcements are organizer/superadmin only. Same
 * shape as requireStaff() - re-check here even though proxy.ts already blocks
 * volunteers from /admin/staff and /admin/announcements.
 */
async function requireOrganizer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const role = getRoleFromAppMetadata(user.app_metadata);
  if (!canManageStaff(role)) {
    throw new Error("Organizer access required");
  }

  return { supabase, user, role };
}

/**
 * Shared upsert for both the manual and auto check-in paths. The unique
 * (event_id, user_id) index makes this idempotent, so a double-scan
 * re-stamps the row instead of erroring.
 */
async function upsertCheckin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  userId: string,
  staffUserId: string,
) {
  const now = new Date().toISOString();

  return supabase.from("event_checkins").upsert(
    {
      event_id: eventId,
      user_id: userId,
      checked_in: true,
      checked_in_at: now,
      checked_in_by: staffUserId,
      updated_at: now,
    },
    { onConflict: "event_id,user_id" },
  );
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

  const { error } = await upsertCheckin(supabase, eventId, profile.user_id, user.id);

  if (error) {
    console.error("Failed to check in user:", error);
    // Surfaces the DB trigger's message when the event isn't a meal or registration.
    return { success: false, message: error.message };
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/portal", "layout");

  return { success: true, message: "Checked in." };
}

/**
 * Auto-resolve a scan to an event without the volunteer picking one: only
 * fires when exactly one check-in event is running (or starting within
 * CHECKIN_LEAD_MINUTES) at the moment of the call. The active set is
 * recomputed here from the server clock rather than trusted from the
 * client - a stale page can't auto-check someone into an event that has
 * since ended or hasn't started yet.
 */
export async function autoCheckInUser(nfcId: string): Promise<AutoCheckinResult> {
  const { supabase, user } = await requireStaff();

  const events = await getCheckinEvents();
  const active = activeCheckinEvents(events, Date.now());

  if (active.length !== 1) {
    return {
      success: false,
      message: "No single event is active.",
      eventId: null,
      eventTitle: null,
    };
  }

  const [event] = active;

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("nfc_id", nfcId)
    .maybeSingle();

  if (!profile) {
    return {
      success: false,
      message: "No hacker found for this tag.",
      eventId: null,
      eventTitle: null,
    };
  }

  const { error } = await upsertCheckin(supabase, event.id, profile.user_id, user.id);

  if (error) {
    console.error("Failed to auto check in user:", error);
    return {
      success: false,
      message: error.message,
      eventId: event.id,
      eventTitle: event.title,
    };
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/portal", "layout");

  return {
    success: true,
    message: `Checked in to ${event.title}.`,
    eventId: event.id,
    eventTitle: event.title,
  };
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
  const { supabase, user } = await requireOrganizer();

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

/** Open, close or reschedule the trek. The RPC re-checks the organizer role. */
export async function updateTrekSettings(formData: FormData): Promise<CheckinResult> {
  const { supabase } = await requireOrganizer();

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

/**
 * Change a staff member's or hacker's role. public.admin_set_user_role()
 * (migrations/0012_staff_management.sql) is the real enforcement - it blocks
 * self-elevation, touching superadmin, and an organizer touching another
 * organizer, each with a distinct message that surfaces here via
 * error.message. Written through the user-scoped client so the RPC sees the
 * caller's own JWT role.
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole,
): Promise<CheckinResult> {
  const { supabase } = await requireOrganizer();

  const { error } = await supabase.rpc("admin_set_user_role", {
    target_user_id: targetUserId,
    new_role: newRole,
  });

  if (error) {
    console.error("Failed to update user role:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/admin", "layout");

  return { success: true, message: "Role updated." };
}

/**
 * Add a brand-new staff member by email. Unlike a hacker, staff never submit
 * an application, so there is no auth.users row to promote until one is
 * created here - the one place this file needs the service-role client.
 */
export async function inviteStaff(formData: FormData): Promise<CheckinResult> {
  const { role: viewerRole } = await requireOrganizer();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const newRole = String(formData.get("role") ?? "");

  if (!email) {
    return { success: false, message: "Email is required." };
  }

  if (!isUserRole(newRole) || (newRole !== "volunteer" && newRole !== "organizer")) {
    return { success: false, message: "Role must be volunteer or organizer." };
  }

  if (newRole === "organizer" && !isSuperadmin(viewerRole)) {
    return { success: false, message: "Only a superadmin can add an organizer." };
  }

  const admin = createAdminClient();

  try {
    let authUser = await findAuthUserByEmail(admin, email);

    if (!authUser) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName } : undefined,
      });

      if (error || !data.user) {
        console.error("Failed to create auth user:", error);
        return { success: false, message: error?.message ?? "Failed to create account." };
      }

      authUser = data.user;
    }

    // The service-role RPC, not admin_set_user_role - this bypasses the
    // organizer-vs-organizer check we've already made above, and its write
    // is what fires user_roles_create_profile (migrations/0006) to
    // provision the profiles row isStaffEmail() needs before a magic link
    // can be sent (lib/auth/magicLinkEligibility.ts).
    const { error: roleError } = await admin.rpc("set_user_role", {
      target_user_id: authUser.id,
      new_role: newRole,
    });

    if (roleError) {
      console.error("Failed to set invited user's role:", roleError);
      return { success: false, message: roleError.message };
    }
  } catch (error) {
    console.error("Failed to invite staff member:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to invite.",
    };
  }

  revalidatePath("/admin", "layout");

  return { success: true, message: `${email} can now sign in at /portal/login.` };
}

/**
 * Post a new announcement. Insert goes through the user-scoped client so the
 * "Organizers can manage announcements" RLS policy (migrations/0012) is the
 * real enforcement. The row is saved before the Discord attempt, so a webhook
 * failure never means a lost announcement - it comes back as a partial
 * success instead of pretending nothing landed.
 */
export async function createAnnouncement(formData: FormData): Promise<CheckinResult> {
  const { supabase, user } = await requireOrganizer();

  const channel = String(formData.get("channel") ?? "").trim() || "announcements";
  const body = String(formData.get("body") ?? "").trim();
  const accentKey = String(formData.get("accent") ?? "");
  const shouldPostToDiscord = formData.get("post_to_discord") === "on";

  if (!body) {
    return { success: false, message: "Announcement body is required." };
  }

  if (!isAnnouncementAccentKey(accentKey)) {
    return { success: false, message: "Choose an accent." };
  }

  const accent = accentCssForKey(accentKey);

  const { data, error } = await supabase
    .from("announcements")
    .insert({ channel, body, accent, created_by: user.id })
    .select()
    .single();

  if (error) {
    console.error("Failed to create announcement:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/portal", "layout");
  revalidatePath("/admin", "layout");

  if (!shouldPostToDiscord) {
    return { success: true, message: "Posted." };
  }

  const webhookUrl = getDiscordWebhookUrl();
  if (!webhookUrl) {
    return {
      success: true,
      message: "Posted to the portal, but DISCORD_WEBHOOK_URL is not set.",
    };
  }

  try {
    await postToDiscord(webhookUrl, {
      embeds: [
        {
          title: `📣 #${channel}`,
          description: body,
          color: discordColorForCss(accent),
          footer: { text: "SummerHacks" },
          timestamp: data.created_at,
        },
      ],
    });
  } catch (discordError) {
    console.error("Failed to post announcement to Discord:", discordError);
    return {
      success: true,
      message: `Posted to the portal, but the Discord ping failed: ${
        discordError instanceof Error ? discordError.message : "unknown error"
      }`,
    };
  }

  return { success: true, message: "Posted to the portal and Discord." };
}

/**
 * Delete an announcement. Discord messages are not retracted - the webhook
 * response's message id is never stored, so there is nothing to delete there.
 */
export async function deleteAnnouncement(id: string): Promise<CheckinResult> {
  const { supabase } = await requireOrganizer();

  const { error } = await supabase.from("announcements").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete announcement:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/portal", "layout");
  revalidatePath("/admin", "layout");

  return { success: true, message: "Deleted." };
}
