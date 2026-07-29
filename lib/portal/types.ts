export type Profile = {
	user_id: string;
	email: string;
	full_name: string;
	team_name: string;
	school: string;
	tracks: string[];
	avatar_url: string | null;
	checked_in: boolean;
	checked_in_at: string | null;
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
] as const;

export type ScheduleEventType = (typeof SCHEDULE_EVENT_TYPES)[number];

export type ScheduleEvent = {
	id: string;
	starts_at: string;
	title: string;
	type: ScheduleEventType;
	location: string;
	sort_order: number;
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
