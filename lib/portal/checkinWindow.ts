import type { ScheduleEvent } from "./types";

/**
 * How far ahead of an event's start we treat it as "about to start" for
 * check-in. Matches LEAD_MINUTES in app/api/events/notify/route.ts - one
 * definition of "soon" across the app.
 */
export const CHECKIN_LEAD_MINUTES = 15;

/**
 * Narrows `events` to the ones a scan can resolve right now: running, or
 * starting within CHECKIN_LEAD_MINUTES. End-exclusive, so back-to-back events
 * never both qualify at the handoff minute.
 *
 * Takes `nowMs` as an argument - same discipline as trekState() in ./trek.ts
 * and pickUpNext() in ./schedule.ts - so it's safe to call during render as
 * well as from a server action.
 *
 * Expects `events` to already be scoped to check_in_required rows (e.g. from
 * getCheckinEvents()); this only narrows by time.
 */
export function activeCheckinEvents(events: ScheduleEvent[], nowMs: number): ScheduleEvent[] {
  const leadMs = CHECKIN_LEAD_MINUTES * 60_000;

  return events.filter((event) => {
    const startsMs = new Date(event.starts_at).getTime();
    if (Number.isNaN(startsMs)) return false;

    const endsMs = event.ends_at ? new Date(event.ends_at).getTime() : NaN;
    // No ends_at: treat as a point in time - active only through the lead window.
    const effectiveEndMs = Number.isNaN(endsMs) ? startsMs : endsMs;

    return nowMs >= startsMs - leadMs && nowMs < effectiveEndMs;
  });
}

/**
 * activeCheckinEvents() against the current clock. Kept in a plain helper -
 * not inlined into a component body - because it reads the current time
 * (react-hooks/purity), the same reason currentTrekState() lives in ./trek.ts.
 */
export function currentActiveCheckinEvents(events: ScheduleEvent[]): ScheduleEvent[] {
  return activeCheckinEvents(events, Date.now());
}
