import "server-only";
import { cache } from "react";
import { type UserRole, isUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { TREK_BUCKET } from "./trek";
import type {
  Announcement,
  EventCheckin,
  MapZone,
  MyScavengerTeam,
  Profile,
  ScavengerAdminTeam,
  ScavengerLeaderboardRow,
  ScavengerLocation,
  ScavengerSettings,
  ScheduleEvent,
  ScoredSubmission,
  Track,
  TrekReviewSubmission,
} from "./types";

/** The currently authenticated hacker (from the Supabase session cookie), or null. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Fetches the signed-in hacker's profile row. The row is provisioned by the
 * database the moment their role grants portal access (see
 * migrations/0006_profile_provisioning.sql), so this is a pure read - a null
 * here means something is wrong with provisioning, not that it's a first visit.
 * RLS scopes the read to `auth.uid() = user_id`.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to read profile:", error);
    return null;
  }

  return data as Profile | null;
});

export async function getTracks(): Promise<Track[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch tracks:", error);
    return [];
  }
  return data as Track[];
}

export async function getSchedule(): Promise<ScheduleEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_events")
    .select("*")
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch schedule:", error);
    return [];
  }
  return data as ScheduleEvent[];
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch announcements:", error);
    return [];
  }
  return data as Announcement[];
}

export async function getMapZones(): Promise<MapZone[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("map_zones")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch map zones:", error);
    return [];
  }
  return data as MapZone[];
}

/** Events a hacker can be checked into - meals and registration only. */
export async function getCheckinEvents(): Promise<ScheduleEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_events")
    .select("*")
    .eq("check_in_required", true)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch check-in events:", error);
    return [];
  }
  return data as ScheduleEvent[];
}

/** Every check-in row for one hacker. Staff read others via the admin RLS policy. */
export async function getCheckinsForUser(userId: string): Promise<EventCheckin[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_checkins")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to fetch check-ins:", error);
    return [];
  }
  return data as EventCheckin[];
}

/** The signed-in hacker's own check-in rows. RLS scopes this to `auth.uid()`. */
export async function getMyCheckins(): Promise<EventCheckin[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  return getCheckinsForUser(user.id);
}

/**
 * Whether the hacker has been checked in at the registration desk. This is what
 * "Checked in" means on the hacker-facing pages - a meal scan doesn't count.
 */
export function isCheckedInAtRegistration(
  checkins: EventCheckin[],
  events: ScheduleEvent[],
): boolean {
  const registrationIds = new Set(
    events.filter((e) => e.type === "Registration").map((e) => e.id),
  );

  return checkins.some((c) => c.checked_in && registrationIds.has(c.event_id));
}

/** Look up the hacker behind a scanned tag. Staff-only via the admin RLS policy. */
export async function getProfileByNfcId(nfcId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("nfc_id", nfcId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch profile by NFC ID:", error);
    return null;
  }
  return data as Profile | null;
}

/** Every portal profile, for the tag provisioning page. Staff-only via RLS. */
export async function getPortalProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Failed to fetch profiles:", error);
    return [];
  }
  return data as Profile[];
}

/** user_id → role for every account staff can see. Staff-only via RLS. */
export async function getUserRolesMap(): Promise<Map<string, UserRole>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_roles").select("user_id, role");

  if (error) {
    console.error("Failed to fetch user roles:", error);
    return new Map();
  }

  const roles = new Map<string, UserRole>();
  for (const row of data ?? []) {
    if (isUserRole(row.role)) roles.set(row.user_id, row.role);
  }
  return roles;
}

// ---------------------------------------------------------------------------
// The Third Space Trek (migrations/0009_scavenger_hunt.sql)
//
// Anything that touches a team goes through an RPC rather than a table read:
// public.scavenger_teams is never granted to `authenticated`, because a
// readable join_code would let any hacker join any team.
// ---------------------------------------------------------------------------

/** Single-row hunt config. Null means the trek has not been set up yet. */
export async function getScavengerSettings(): Promise<ScavengerSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("scavenger_settings").select("*").maybeSingle();

  if (error) {
    console.error("Failed to fetch trek settings:", error);
    return null;
  }
  return data as ScavengerSettings | null;
}

/**
 * The suggested spots. Retired ones are hidden from hackers but still needed
 * on the staff review page, where an old submission may point at one.
 */
export async function getScavengerLocations(
  includeInactive = false,
): Promise<ScavengerLocation[]> {
  const supabase = await createClient();
  const query = supabase
    .from("scavenger_locations")
    .select("*")
    .order("sort_order", { ascending: true });

  if (!includeInactive) query.eq("is_active", true);

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch trek locations:", error);
    return [];
  }
  return data as ScavengerLocation[];
}

/**
 * The signed-in hacker's team, including its join code and the timestamp at
 * which the team may log its next photo. Null when they aren't on a team yet.
 * Cached per request because the page and its children both need it.
 */
export const getMyScavengerTeam = cache(async (): Promise<MyScavengerTeam | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("scavenger_my_team").maybeSingle();

  if (error) {
    console.error("Failed to fetch trek team:", error);
    return null;
  }
  return data as MyScavengerTeam | null;
});

/** Every team's standings. Visible to all portal users - that's the point. */
export async function getScavengerLeaderboard(): Promise<ScavengerLeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("scavenger_leaderboard");

  if (error) {
    console.error("Failed to fetch trek leaderboard:", error);
    return [];
  }
  return data as ScavengerLeaderboardRow[];
}

/**
 * One row per logged photo with what it scored. Omit `teamId` for your own
 * team; staff may pass any team id (the RPC re-checks the role either way).
 */
export async function getTeamSubmissions(teamId?: string): Promise<ScoredSubmission[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("scavenger_team_submissions", {
    p_team_id: teamId ?? null,
  });

  if (error) {
    console.error("Failed to fetch trek submissions:", error);
    return [];
  }
  return data as ScoredSubmission[];
}

/**
 * Every photo ever logged, newest first, for the staff review queue. Reads the
 * table rather than the scoring RPC precisely because rejected rows and the
 * review audit trail have to stay visible. Staff-only via RLS.
 */
export async function getTrekReviewQueue(): Promise<TrekReviewSubmission[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scavenger_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch trek review queue:", error);
    return [];
  }
  return data as TrekReviewSubmission[];
}

/** Every team with its roster, join code and points. Staff-only via the RPC. */
export async function getScavengerAdminTeams(): Promise<ScavengerAdminTeam[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("scavenger_admin_teams");

  if (error) {
    console.error("Failed to fetch trek teams:", error);
    return [];
  }
  return data as ScavengerAdminTeam[];
}

/**
 * Short-lived signed URLs for photos in the private trek bucket, keyed by
 * object path. Minted through the user-scoped client, so the storage policies
 * decide what comes back: a hacker gets their own team's folder, staff get
 * everything, and anything unreadable is simply absent from the map.
 */
export async function getTrekPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(TREK_BUCKET)
    .createSignedUrls(paths, 60 * 60);

  if (error) {
    console.error("Failed to sign trek photo URLs:", error);
    return {};
  }

  const urls: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  return urls;
}
