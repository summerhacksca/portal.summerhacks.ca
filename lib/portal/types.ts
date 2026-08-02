import type { UserRole } from "@/lib/auth/roles";

export type Profile = {
  user_id: string;
  email: string;
  full_name: string;
  team_name: string;
  school: string;
  tracks: string[];
  avatar_url: string | null;
  nfc_id: string;
  created_at: string;
  updated_at: string;
};

/** One row on /admin/staff - a profile merged with its current role. */
export type StaffMember = {
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
};

export type Track = {
  id: string;
  name: string;
  slug: string;
  accent_color: string;
  sort_order: number;
};

export const SCHEDULE_EVENT_TYPES = [
  "Workshop",
  "Meal",
  "Judging",
  "Ceremony",
  "Social",
  "Talk",
  "Expo",
  "Milestone",
  "Registration",
] as const;

export type ScheduleEventType = (typeof SCHEDULE_EVENT_TYPES)[number];

export type ScheduleEvent = {
  id: string;
  starts_at: string;
  /** Null for point-in-time rows (milestones, deadlines) - see migrations/0013. */
  ends_at: string | null;
  title: string;
  type: ScheduleEventType;
  location: string;
  sort_order: number;
  /** Only meals and registration are checked into. Enforced by a DB trigger too. */
  check_in_required: boolean;
  /** Set by app/api/events/notify/route.ts once a Discord "starting soon" embed has been sent. */
  discord_notified: boolean;
};

/** One row per (event, hacker). Undo flips `checked_in` rather than deleting. */
export type EventCheckin = {
  id: string;
  event_id: string;
  user_id: string;
  checked_in: boolean;
  checked_in_at: string;
  checked_in_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Announcement = {
  id: string;
  channel: string;
  body: string;
  accent: string;
  created_at: string;
  created_by: string | null;
};

export type MapZone = {
  id: string;
  name: string;
  description: string;
  color: string;
  sort_order: number;
};

/**
 * The Third Space Trek - the team scavenger hunt (migrations/0009).
 *
 * Photos score the moment they land ('pending'); organizers review afterwards.
 * 'rejected' is the only status that costs points.
 */
export const SUBMISSION_STATUSES = ["pending", "approved", "rejected"] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** Single-row config. Staff edit it at /admin/trek; a DB trigger enforces it. */
export type ScavengerSettings = {
  id: boolean;
  starts_at: string;
  ends_at: string;
  /** Manual kill switch, independent of the schedule. */
  is_open: boolean;
  cooldown_minutes: number;
  max_team_size: number;
  new_spot_points: number;
  repeat_spot_points: number;
  updated_at: string;
};

export type ScavengerLocation = {
  id: string;
  name: string;
  area: string;
  tier: "Free" | "Purchase";
  notes: string;
  sort_order: number;
  is_active: boolean;
};

/**
 * From public.scavenger_my_team(). The only path by which a hacker ever sees a
 * join code - their own. `public.scavenger_teams` is not readable directly.
 */
export type MyScavengerTeam = {
  team_id: string;
  team_name: string;
  team_slug: string;
  join_code: string;
  member_count: number;
  members: string[];
  last_logged_at: string | null;
  next_allowed_at: string | null;
};

export type ScavengerLeaderboardRow = {
  team_id: string;
  team_name: string;
  team_slug: string;
  points: number;
  photo_count: number;
  spots_found: number;
  last_logged_at: string | null;
};

/**
 * From public.scavenger_team_submissions(). Points are derived by a window
 * function, never stored, so rejecting a photo re-flows the 2pt discovery
 * bonus onto the team's next surviving photo at that location.
 */
export type ScoredSubmission = {
  id: string;
  team_id: string;
  location_id: string | null;
  location_name: string | null;
  custom_location: string | null;
  photo_path: string;
  status: SubmissionStatus;
  review_note: string;
  /** 1 means this was the team's first photo at that spot. Null for custom spots. */
  visit_number: number | null;
  points: number;
  created_at: string;
};

/** A scored submission plus a short-lived signed URL - the bucket is private. */
export type ScoredSubmissionWithPhoto = ScoredSubmission & {
  photo_url: string | null;
};

export type ScavengerAdminTeam = {
  team_id: string;
  team_name: string;
  team_slug: string;
  join_code: string;
  member_count: number;
  members: string[];
  points: number;
  photo_count: number;
  last_logged_at: string | null;
};

/** Raw row for the staff review queue - unlike ScoredSubmission this keeps
 *  rejected photos and the review audit trail. */
export type TrekReviewSubmission = {
  id: string;
  team_id: string;
  location_id: string | null;
  custom_location: string | null;
  submitted_by: string;
  photo_path: string;
  status: SubmissionStatus;
  review_note: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};
