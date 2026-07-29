import type { ScheduleEvent } from "./types";

/**
 * Picks the next `count` upcoming events (falls back to the last `count` if
 * the event has already ended). Kept in a plain helper — not inlined into a
 * component body — because it reads the current time (react-hooks/purity).
 */
export function pickUpNext(events: ScheduleEvent[], count = 2): ScheduleEvent[] {
	const now = Date.now();
	const upcoming = events.filter((e) => new Date(e.starts_at).getTime() >= now);
	return (upcoming.length > 0 ? upcoming : events.slice(-count)).slice(0, count);
}
