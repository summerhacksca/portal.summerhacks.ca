import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
	Announcement,
	EventCheckin,
	MapZone,
	Profile,
	ScheduleEvent,
	Sponsor,
	Track,
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
 * Fetches the signed-in hacker's profile row, creating a seed row on first
 * visit (email + best-effort name from auth metadata). RLS scopes every
 * operation to `auth.uid() = user_id`.
 */
export const getOrCreateProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) {
    console.error("Failed to read profile:", readError);
    return null;
  }

  if (existing) return existing as Profile;

  const seedName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    "";

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      email: user.email ?? "",
      full_name: seedName,
    })
    .select("*")
    .single();

  if (insertError) {
    // Layout + page can both call this on first login; the loser hits 23505.
    if (insertError.code === "23505") {
      const { data: raced, error: retryError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (retryError) {
        console.error("Failed to read profile after insert race:", retryError);
        return null;
      }

      return raced as Profile | null;
    }

    console.error("Failed to create profile:", insertError);
    return null;
  }

  return created as Profile;
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

export async function getSponsors(): Promise<Sponsor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch sponsors:", error);
    return [];
  }
  return data as Sponsor[];
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

/** Events a hacker can be checked into — meals and registration only. */
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
 * "Checked in" means on the hacker-facing pages — a meal scan doesn't count.
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
