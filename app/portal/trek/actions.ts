"use server";

import { revalidatePath } from "next/cache";
import { TREK_BUCKET, trekState } from "@/lib/portal/trek";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * The Third Space Trek. Team reads and writes all go through the SECURITY
 * DEFINER RPCs in migrations/0009 — `public.scavenger_teams` is deliberately
 * not readable by `authenticated`, because a visible join_code would let any
 * hacker join any team.
 *
 * These actions throw with hacker-facing wording; the forms catch and render
 * the message, the same contract as updateProfile in ../actions.ts. Where the
 * message comes from a RAISE in Postgres it is already written for a hacker
 * ("Team \"Fern & Ash\" is full (4 members)."), so it is passed straight
 * through.
 */

/** Matches allowed_mime_types on the scavenger-hunt bucket. */
const ALLOWED_EXTENSIONS = new Set(["jpg", "png", "webp", "heic"]);

type TeamForUpload = {
  team_id: string;
  team_slug: string;
  next_allowed_at: string | null;
};

export type TrekUploadTicket = {
  path: string;
  token: string;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return { supabase, user };
}

export async function createTrekTeam(formData: FormData) {
  const { supabase } = await requireUser();

  const name = String(formData.get("team_name") ?? "").trim();

  const { error } = await supabase.rpc("scavenger_create_team", { p_name: name });

  if (error) {
    console.error("Failed to create trek team:", error);
    throw new Error(error.message);
  }

  revalidatePath("/portal", "layout");
}

export async function joinTrekTeam(formData: FormData) {
  const { supabase } = await requireUser();

  const code = String(formData.get("join_code") ?? "").trim();

  const { error } = await supabase.rpc("scavenger_join_team", { p_join_code: code });

  if (error) {
    console.error("Failed to join trek team:", error);
    throw new Error(error.message);
  }

  revalidatePath("/portal", "layout");
}

export async function leaveTrekTeam() {
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("scavenger_leave_team");

  if (error) {
    console.error("Failed to leave trek team:", error);
    throw new Error(error.message);
  }

  revalidatePath("/portal", "layout");
}

/**
 * Step one of logging a photo: hand the browser a ticket to upload straight
 * into its own team folder, so the file never round-trips through a function.
 *
 * The ticket is minted with the user-scoped client, which means the
 * "Trek members write own team folder" storage policy runs here, at mint time
 * — a hacker cannot obtain a ticket pointing anywhere but their own folder.
 *
 * The window and cooldown are re-checked first so a closed hunt fails now
 * rather than after the hacker has waited out an upload on cafe wifi. The
 * database checks them again on insert; this is only about the error arriving
 * at a useful moment.
 */
export async function startPhotoUpload(extension: string): Promise<TrekUploadTicket> {
  const { supabase } = await requireUser();

  const { data: team, error: teamError } = await supabase
    .rpc("scavenger_my_team")
    .maybeSingle<TeamForUpload>();

  if (teamError || !team) {
    throw new Error("Join or create a team before logging a photo.");
  }

  const { data: settings } = await supabase
    .from("scavenger_settings")
    .select("*")
    .maybeSingle();

  const state = trekState(
    {
      isOpen: settings?.is_open ?? false,
      startsAt: settings?.starts_at ?? null,
      endsAt: settings?.ends_at ?? null,
      nextAllowedAt: team.next_allowed_at,
    },
    Date.now(),
  );

  if (!state.canSubmit) {
    throw new Error(state.detail || "The trek is not open right now.");
  }

  const safeExtension = ALLOWED_EXTENSIONS.has(extension) ? extension : "jpg";
  const path = `${team.team_slug}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

  const { data, error } = await supabase.storage
    .from(TREK_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error("Failed to mint trek upload URL:", error);
    throw new Error("Could not start the upload. Try again.");
  }

  return { path: data.path, token: data.token };
}

/**
 * Step two: record the row now that the photo is in the bucket. The insert
 * trigger has the last word on the window, the cooldown and the folder, so its
 * message is what a hacker sees if they raced the clock.
 */
export async function recordTrekSubmission(input: {
  path: string;
  locationId: string | null;
  customLocation: string;
}) {
  const { supabase, user } = await requireUser();

  const { data: team, error: teamError } = await supabase
    .rpc("scavenger_my_team")
    .maybeSingle<TeamForUpload>();

  if (teamError || !team) {
    throw new Error("Join or create a team before logging a photo.");
  }

  const custom = input.customLocation.trim();

  if (!input.locationId && !custom) {
    throw new Error("Pick a spot, or type where you worked from.");
  }

  // Confirm the object actually landed. Signing fails both when it is missing
  // and when the storage policy says the folder isn't ours.
  const { error: photoError } = await supabase.storage
    .from(TREK_BUCKET)
    .createSignedUrl(input.path, 60);

  if (photoError) {
    console.error("Failed to verify trek photo:", photoError);
    throw new Error("That photo didn't finish uploading. Try again.");
  }

  const { error } = await supabase.from("scavenger_submissions").insert({
    team_id: team.team_id,
    location_id: input.locationId,
    custom_location: input.locationId ? null : custom,
    submitted_by: user.id,
    photo_path: input.path,
  });

  if (error) {
    console.error("Failed to record trek submission:", error);

    // Don't leave the photo behind when the row it belongs to never landed.
    // Members have no DELETE policy on the bucket by design — photos are meant
    // to be immutable evidence — so this one cleanup goes through the service
    // role, on a path the server just built itself.
    const { error: cleanupError } = await createAdminClient()
      .storage.from(TREK_BUCKET)
      .remove([input.path]);

    if (cleanupError) {
      console.error("Failed to clean up orphaned trek photo:", cleanupError);
    }

    throw new Error(error.message);
  }

  revalidatePath("/portal", "layout");
}
