-- Run this SQL in your Supabase Dashboard → SQL Editor
-- Run AFTER 0012_staff_management.sql.
--
-- Re-seeds the Aug 8-9, 2026 run-of-show from the finalized schedule
-- spreadsheets, replacing the placeholder rows from 0002_portal_tables.sql
-- (already cleared by hand before this migration was written).
--
-- Also adds schedule_events.ends_at, needed to know when an event stops
-- being "currently happening" - the auto check-in flow
-- (lib/portal/checkinWindow.ts) and the hacker-facing schedule both use it.
--
-- Organizer-only logistics rows (venue/booth/judging-room setup) are
-- deliberately left out - schedule_events is readable by every portal user
-- and feeds the Discord "starting soon" bot, and hackers don't need to see
-- them. Nothing is seeded for Fri Aug 7 for the same reason.
--
-- check_in_required is set per row to match the spreadsheets' color coding:
-- true only for the green ("checkin at Stackt") and blue/grey ("checkin at
-- Park") blocks - registration and food. Purple (activities) and yellow
-- (logistics/milestones) rows are never check-in, even Ceremony/Judging.
--
-- ⚠️ Times were transcribed from screenshots - please sanity-check before
-- running. Least certain: the Swag/check-in table window (rows 1 and 14,
-- currently 9:00-11:00) and S'mores and snacks (row 12, currently
-- 8:00-10:00 PM).
--
-- Idempotent: safe to re-run - always deletes and re-inserts this window.
-- Re-running after check-ins have started will cascade-delete those
-- check-ins (event_checkins.event_id ON DELETE CASCADE) - fine before the
-- event, not during it.

-- =========================================================
-- a. schedule_events.ends_at
-- =========================================================

ALTER TABLE public.schedule_events
	ADD COLUMN IF NOT EXISTS ends_at timestamptz;

ALTER TABLE public.schedule_events
	DROP CONSTRAINT IF EXISTS schedule_events_ends_after_starts;

ALTER TABLE public.schedule_events
	ADD CONSTRAINT schedule_events_ends_after_starts
	CHECK (ends_at IS NULL OR ends_at > starts_at);

-- =========================================================
-- b. Replace the Aug 8-9 rows
--
-- Scoped delete rather than ON CONFLICT DO UPDATE: these times may still
-- need correcting, and an upsert keyed on (starts_at, title) would leave
-- orphaned rows behind whenever a time shifts.
-- =========================================================

DELETE FROM public.schedule_events
WHERE starts_at >= '2026-08-08T00:00:00-04:00'
  AND starts_at <  '2026-08-10T00:00:00-04:00';

INSERT INTO public.schedule_events
	(starts_at, ends_at, title, type, location, sort_order, check_in_required) VALUES
	-- Day 1 · Sat Aug 8 · Stackt Market + the park
	('2026-08-08T09:00:00-04:00', '2026-08-08T11:00:00-04:00', 'Swag / check-in table', 'Registration', 'Stackt Market', 1, true),
	('2026-08-08T09:00:00-04:00', NULL, 'Main track revealed', 'Milestone', '', 2, false),
	('2026-08-08T09:30:00-04:00', '2026-08-08T10:30:00-04:00', 'Breakfast', 'Meal', 'Stackt Market', 3, true),
	('2026-08-08T10:00:00-04:00', '2026-08-08T11:00:00-04:00', 'Team formation + Bubbles', 'Social', 'Stackt Market', 4, false),
	('2026-08-08T11:00:00-04:00', '2026-08-08T11:30:00-04:00', 'Opening ceremony', 'Ceremony', 'Stackt Market', 5, false),
	('2026-08-08T11:30:00-04:00', NULL, 'Hacking starts', 'Milestone', '', 6, false),
	('2026-08-08T12:00:00-04:00', '2026-08-08T23:00:00-04:00', 'Scavenger hunt', 'Social', 'Citywide · starts at Stackt Market', 7, false),
	('2026-08-08T12:00:00-04:00', '2026-08-08T14:00:00-04:00', 'Lunch', 'Meal', 'Park', 8, true),
	('2026-08-08T15:00:00-04:00', '2026-08-08T16:00:00-04:00', 'Basketball (HORSE)', 'Social', 'Stackt Market', 9, false),
	('2026-08-08T16:00:00-04:00', '2026-08-08T18:00:00-04:00', 'Paper making craft', 'Social', 'Stackt Market', 10, false),
	('2026-08-08T18:00:00-04:00', '2026-08-08T20:00:00-04:00', 'Dinner', 'Meal', 'Park · hackers free to explore Toronto', 11, true),
	('2026-08-08T20:00:00-04:00', '2026-08-08T22:00:00-04:00', 'S''mores and snacks', 'Meal', 'Park', 12, true),
	('2026-08-08T22:00:00-04:00', NULL, 'Track submission deadline', 'Milestone', '', 13, false),
	-- Day 2 · Sun Aug 9 · Stackt Market + the park
	('2026-08-09T09:00:00-04:00', '2026-08-09T11:00:00-04:00', 'Swag / check-in table', 'Registration', 'Stackt Market', 14, true),
	('2026-08-09T09:30:00-04:00', '2026-08-09T10:30:00-04:00', 'Breakfast', 'Meal', 'Stackt Market', 15, true),
	('2026-08-09T10:00:00-04:00', '2026-08-09T11:00:00-04:00', 'Bubbles', 'Social', 'Stackt Market', 16, false),
	('2026-08-09T11:00:00-04:00', NULL, 'Project submission soft deadline', 'Milestone', '', 17, false),
	('2026-08-09T11:30:00-04:00', '2026-08-09T13:00:00-04:00', 'Lemonade stand', 'Meal', 'Park', 18, true),
	('2026-08-09T12:00:00-04:00', '2026-08-09T12:30:00-04:00', 'Fruit eating contest', 'Social', 'Park', 19, false),
	('2026-08-09T12:30:00-04:00', '2026-08-09T14:00:00-04:00', 'Lunch', 'Meal', 'Park', 20, true),
	('2026-08-09T13:00:00-04:00', NULL, 'Project submission hard deadline', 'Milestone', '', 21, false),
	('2026-08-09T13:30:00-04:00', '2026-08-09T14:00:00-04:00', 'Parachute or spikeball', 'Social', 'Stackt Market', 22, false),
	('2026-08-09T14:00:00-04:00', NULL, 'Judging schedule released', 'Milestone', '', 23, false),
	('2026-08-09T15:00:00-04:00', '2026-08-09T17:00:00-04:00', 'Judging', 'Judging', 'Stackt Market', 24, false),
	('2026-08-09T17:00:00-04:00', '2026-08-09T18:00:00-04:00', 'Judging deliberation', 'Judging', 'Stackt Market', 25, false),
	('2026-08-09T18:00:00-04:00', '2026-08-09T19:00:00-04:00', 'Closing ceremony', 'Ceremony', 'Stackt Market', 26, false);
