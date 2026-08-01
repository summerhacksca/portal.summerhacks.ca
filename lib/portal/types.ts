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

export type Track = {
  id: string;
  name: string;
  slug: string;
  accent_color: string;
  sort_order: number;
};

export type Sponsor = {
  id: string;
  name: string;
  track: string;
  challenge: string;
  prize: string;
  logo_url: string | null;
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
};

export type MapZone = {
  id: string;
  name: string;
  description: string;
  color: string;
  sort_order: number;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
};

export type HelpContact = {
  id: string;
  topic: string;
  contact: string;
  location: string;
  sort_order: number;
};
