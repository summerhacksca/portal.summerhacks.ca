import type { FaqItem, HelpContact } from "./types";

/**
 * FAQ and "Who do I ask?" directory content. Hardcoded rather than
 * Supabase-backed since it changes rarely and doesn't need a redeploy-free
 * editing flow the way schedule/announcements do.
 */
export const FAQ_ITEMS: FaqItem[] = [
	{
		id: "check-in",
		question: "How do I check in?",
		answer:
			"Tap “Show my QR” on your profile and hold the code up at the registration desk near Main Stage - a volunteer scans you in. If you picked up an NFC tag, tapping it does the same thing. You'll also be scanned before each meal.",
		sort_order: 1,
	},
	{
		id: "submit-project",
		question: "Where do I submit my project?",
		answer:
			"All submissions go through Agorize - use the Submit link in the header. Submissions lock at 2:00 PM Sunday.",
		sort_order: 2,
	},
	{
		id: "incomplete-team",
		question: "What if my team is incomplete?",
		answer:
			"Post in #team-formation on Discord any time before Sunday morning - plenty of solo hackers are looking too.",
		sort_order: 3,
	},
	{
		id: "switch-track",
		question: "Can I switch sponsor challenges or tracks?",
		answer:
			"Yes, any time before the submission lock. Just update your profile and mention it to a judge at judging.",
		sort_order: 4,
	},
	{
		id: "food",
		question: "Where can I find food?",
		answer:
			"The Yard, at the meal times listed on the schedule. Dietary accommodations are available at the same table.",
		sort_order: 5,
	},
	{
		id: "quiet-space",
		question: "Is there a quiet space?",
		answer:
			"Yes - the Quiet Room in Container Row C is a low-stimulation space, open all day.",
		sort_order: 6,
	},
	{
		id: "tech-issue",
		question: "What do I do about a technical issue?",
		answer:
			"Post in #tech-help on Discord, or flag down any volunteer wearing an orange lanyard.",
		sort_order: 7,
	},
];

export const HELP_CONTACTS: HelpContact[] = [
	{
		id: "general",
		topic: "General questions",
		contact: "Volunteers (orange lanyards)",
		location: "#general-help on Discord, or anywhere on-site",
		sort_order: 1,
	},
	{
		id: "sponsors",
		topic: "Sponsor challenges & prizes",
		contact: "Sponsor booth reps",
		location: "Market Hall, 11:30 AM-5:30 PM",
		sort_order: 2,
	},
	{
		id: "judging",
		topic: "Judging & submissions",
		contact: "Judging captains",
		location: "Container Row A/B, or #judging on Discord",
		sort_order: 3,
	},
	{
		id: "wifi",
		topic: "Wifi / tech issues",
		contact: "Tech volunteers",
		location: "#tech-help on Discord",
		sort_order: 4,
	},
	{
		id: "medical",
		topic: "Medical / safety",
		contact: "On-site first aid",
		location: "Registration desk, Main Stage",
		sort_order: 5,
	},
	{
		id: "team-formation",
		topic: "Team formation",
		contact: "Organizer team",
		location: "#team-formation on Discord",
		sort_order: 6,
	},
];
