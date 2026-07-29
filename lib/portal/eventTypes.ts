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
};
