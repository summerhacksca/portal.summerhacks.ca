import type { ScheduleEventType } from "./types";

/** Type → accent color mapping for schedule rows (mirrors the design mockup). */
export const EVENT_TYPE_COLOR: Record<ScheduleEventType, string> = {
	Ceremony: "var(--orange)",
	Workshop: "var(--sun-300)",
	Social: "var(--blue)",
	Talk: "var(--blue)",
	Milestone: "var(--terracotta)",
	Meal: "var(--green)",
	Expo: "var(--blue)",
	Judging: "var(--purple)",
	Registration: "var(--terracotta)",
};

/**
 * Type → Discord embed color, as literal hex ints (Discord embeds can't
 * resolve CSS custom properties). Kept in sync with the `--*` values in
 * app/globals.css and EVENT_TYPE_COLOR above.
 */
export const EVENT_TYPE_DISCORD_COLOR: Record<ScheduleEventType, number> = {
	Ceremony: 0xff8800, // --orange
	Workshop: 0xfdb869, // --sun-300
	Social: 0x477eff, // --blue
	Talk: 0x477eff, // --blue
	Milestone: 0xbd3c3c, // --terracotta
	Meal: 0x8fc200, // --green
	Expo: 0x477eff, // --blue
	Judging: 0xa172ff, // --purple
	Registration: 0xbd3c3c, // --terracotta
};
