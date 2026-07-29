import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
	Announcement,
	FaqItem,
	HelpContact,
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
export async function getOrCreateProfile(): Promise<Profile | null> {
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
		console.error("Failed to create profile:", insertError);
		return null;
	}

	return created as Profile;
}

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

export async function getFaq(): Promise<FaqItem[]> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("faq_items")
		.select("*")
		.order("sort_order", { ascending: true });

	if (error) {
		console.error("Failed to fetch FAQ:", error);
		return [];
	}
	return data as FaqItem[];
}

export async function getDirectory(): Promise<HelpContact[]> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("help_contacts")
		.select("*")
		.order("sort_order", { ascending: true });

	if (error) {
		console.error("Failed to fetch help directory:", error);
		return [];
	}
	return data as HelpContact[];
}
