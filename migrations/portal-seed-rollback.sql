-- Run this SQL in your Supabase Dashboard → SQL Editor to remove the seed
-- rows inserted by 0002_portal_tables.sql, without dropping the
-- tables themselves.
--
-- Does NOT touch public.profiles (hacker-owned data) or
-- public.application_submissions / public.rsvp_submissions.

-- =========================================================
-- Option A — delete all rows in these content tables, no matter
-- what's in them. Simplest option, but also wipes any real content
-- you've since added by hand alongside the seed rows. These 5 tables
-- are organizer-managed only (no hacker-facing write policy), so this
-- is safe to run any time you want a clean slate before re-seeding.
-- =========================================================
-- TRUNCATE public.tracks, public.sponsors, public.schedule_events, public.announcements, public.map_zones;

-- =========================================================
-- Option B — delete only the known seed rows, matched by their
-- distinguishing column(s). Safer if you've added real content
-- alongside the seed data and want to keep it.
-- =========================================================

DELETE FROM public.tracks WHERE slug IN (
	'sustainability',
	'ai-ml',
	'fintech',
	'health',
	'hardware',
	'data',
	'security',
	'education'
);

DELETE FROM public.sponsors WHERE name IN (
	'Nimbus Cloud',
	'Fenwick Robotics',
	'BrightLedger',
	'Solstice Health',
	'Voltway Energy',
	'Greenhouse Analytics',
	'Pathfinder Labs',
	'Northwind Data',
	'Cobalt Systems',
	'Everline Finance',
	'Lumen AI',
	'Cedar & Co',
	'Trailhead Robotics'
);

DELETE FROM public.schedule_events WHERE (starts_at, title) IN (
	('2026-08-09T07:45:00-04:00', 'Registration / check-in'),
	('2026-08-08T10:00:00-04:00', 'Opening ceremony (livestream)'),
	('2026-08-08T11:00:00-04:00', 'Workshop: Intro to APIs'),
	('2026-08-08T12:30:00-04:00', 'Team formation mixer'),
	('2026-08-08T13:30:00-04:00', 'Workshop: Designing your MVP'),
	('2026-08-08T15:00:00-04:00', 'Sponsor tech talks'),
	('2026-08-08T17:00:00-04:00', 'Hacking begins'),
	('2026-08-08T20:00:00-04:00', 'Evening check-in / progress post'),
	('2026-08-09T08:00:00-04:00', 'Doors open + breakfast'),
	('2026-08-09T09:00:00-04:00', 'Workshop: Pitching 101'),
	('2026-08-09T10:00:00-04:00', 'Workshop: Polishing your demo'),
	('2026-08-09T11:30:00-04:00', 'Sponsor booths open'),
	('2026-08-09T12:30:00-04:00', 'Lunch'),
	('2026-08-09T14:00:00-04:00', 'Submission lock (Agorize)'),
	('2026-08-09T14:30:00-04:00', 'Judging window — round 1'),
	('2026-08-09T16:30:00-04:00', 'Judging window — finalists'),
	('2026-08-09T18:00:00-04:00', 'Closing ceremony + awards'),
	('2026-08-09T19:00:00-04:00', 'Dinner + send-off')
);

DELETE FROM public.announcements WHERE body IN (
	'Breakfast is live in The Yard until 9:30 — grab something before workshops start.',
	'Sponsor booths in Market Hall open at 11:30. Bring questions for Fenwick Robotics and Cobalt Systems.',
	'Wifi network is "SummerHacks-Guest", password is on your lanyard.',
	'Reminder: submissions lock at 2:00 PM sharp on Agorize. No late submissions.'
);

DELETE FROM public.map_zones WHERE name IN (
	'Main Stage',
	'The Yard',
	'Container Row A',
	'Container Row B',
	'Market Hall',
	'Quiet Room',
	'Registration / check-in',
	'Washrooms'
);
