-- Run this SQL in your Supabase Dashboard → SQL Editor
-- This creates the tables needed for the event-day Hacker Portal
-- (Home, Schedule, Venue Map, Sponsors, Profile, Help Desk) in the
-- `public` schema.
--
-- Existing tables (public.application_submissions, public.rsvp_submissions) are untouched.
--
-- `public` is exposed via the Data API by default, so no Dashboard
-- config changes are required beyond running this SQL.

-- =========================================================
-- public.profiles - one row per hacker, keyed to auth.users
-- =========================================================
CREATE TABLE IF NOT EXISTS public.profiles (
	user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
	email text NOT NULL,
	full_name text NOT NULL DEFAULT '',
	team_name text NOT NULL DEFAULT '',
	school text NOT NULL DEFAULT '',
	tracks text[] NOT NULL DEFAULT '{}',
	avatar_url text,
	checked_in boolean NOT NULL DEFAULT false,
	checked_in_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
	FOR SELECT TO authenticated
	USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
	FOR INSERT TO authenticated
	WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
	FOR UPDATE TO authenticated
	USING (auth.uid() = user_id)
	WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- =========================================================
-- public.tracks - canonical track list (profile selector, sponsor badges)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.tracks (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text NOT NULL,
	slug text NOT NULL UNIQUE,
	accent_color text NOT NULL DEFAULT 'var(--sun-300)',
	sort_order int NOT NULL DEFAULT 0,
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tracks" ON public.tracks
	FOR SELECT TO authenticated
	USING (true);

GRANT SELECT ON public.tracks TO authenticated;
GRANT ALL ON public.tracks TO service_role;

-- =========================================================
-- public.sponsors - Sponsor Board cards
-- =========================================================
CREATE TABLE IF NOT EXISTS public.sponsors (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text NOT NULL,
	track text NOT NULL,
	challenge text NOT NULL,
	prize text NOT NULL,
	logo_url text,
	sort_order int NOT NULL DEFAULT 0,
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sponsors" ON public.sponsors
	FOR SELECT TO authenticated
	USING (true);

GRANT SELECT ON public.sponsors TO authenticated;
GRANT ALL ON public.sponsors TO service_role;

-- =========================================================
-- public.schedule_events - Master Schedule
-- =========================================================
CREATE TABLE IF NOT EXISTS public.schedule_events (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	starts_at timestamptz NOT NULL,
	title text NOT NULL,
	type text NOT NULL CHECK (type IN ('Workshop', 'Meal', 'Judging', 'Ceremony', 'Social', 'Talk', 'Expo', 'Milestone')),
	location text NOT NULL DEFAULT '',
	sort_order int NOT NULL DEFAULT 0,
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read schedule" ON public.schedule_events
	FOR SELECT TO authenticated
	USING (true);

CREATE INDEX IF NOT EXISTS idx_schedule_events_starts_at ON public.schedule_events(starts_at);

GRANT SELECT ON public.schedule_events TO authenticated;
GRANT ALL ON public.schedule_events TO service_role;

-- =========================================================
-- public.announcements - Home "Live announcements"
-- =========================================================
CREATE TABLE IF NOT EXISTS public.announcements (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	channel text NOT NULL,
	body text NOT NULL,
	accent text NOT NULL DEFAULT 'rgba(42,42,42,0.1)',
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read announcements" ON public.announcements
	FOR SELECT TO authenticated
	USING (true);

GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;

-- =========================================================
-- public.map_zones - Venue Map legend
-- =========================================================
CREATE TABLE IF NOT EXISTS public.map_zones (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text NOT NULL,
	description text NOT NULL,
	color text NOT NULL DEFAULT 'var(--sun-300)',
	sort_order int NOT NULL DEFAULT 0,
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.map_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read map zones" ON public.map_zones
	FOR SELECT TO authenticated
	USING (true);

GRANT SELECT ON public.map_zones TO authenticated;
GRANT ALL ON public.map_zones TO service_role;

-- =========================================================
-- Seed data (ported from the Hacker Portal design mockup)
-- FAQ and "Who do I ask?" directory are hardcoded in the app
-- (see lib/portal/staticContent.ts) rather than stored here.
-- Event weekend: Sat Aug 8 (online) - Sun Aug 9 (in-person), Toronto (EDT, UTC-4)
-- =========================================================

INSERT INTO public.tracks (name, slug, accent_color, sort_order) VALUES
	('Sustainability', 'sustainability', 'var(--green)', 1),
	('AI/ML', 'ai-ml', 'var(--purple)', 2),
	('Fintech', 'fintech', 'var(--blue)', 3),
	('Health', 'health', 'var(--terracotta)', 4),
	('Hardware', 'hardware', 'var(--sun-300)', 5),
	('Data', 'data', 'var(--blue-2)', 6),
	('Security', 'security', 'var(--red)', 7),
	('Education', 'education', 'var(--orange)', 8)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.sponsors (name, track, challenge, prize, sort_order) VALUES
	('Nimbus Cloud', 'Infrastructure', 'Build a tool that makes cloud costs visible and understandable for small teams.', '$1,500 + mentorship', 1),
	('Fenwick Robotics', 'Hardware', 'Prototype a sensor-driven fix for a real-world accessibility problem.', '$1,200 + dev kits', 2),
	('BrightLedger', 'Fintech', 'Design a safer way for students to split and track shared expenses.', '$1,000 cash', 3),
	('Solstice Health', 'Health', 'Create a lightweight way for campus clinics to triage walk-ins.', '$1,000 cash', 4),
	('Voltway Energy', 'Sustainability', 'Best hack that nudges households toward lower peak-hour energy use.', '$1,500 cash', 5),
	('Greenhouse Analytics', 'Sustainability', 'Turn open agricultural data into an actionable dashboard for small farms.', '$800 cash', 6),
	('Pathfinder Labs', 'AI/ML', 'Most creative use of a language model for accessibility or education.', '$1,500 + API credits', 7),
	('Northwind Data', 'Data', 'Best visualization built entirely on a public civic dataset.', '$800 cash', 8),
	('Cobalt Systems', 'Security', 'Build a tool that helps small teams spot leaked credentials early.', '$1,000 cash', 9),
	('Everline Finance', 'Fintech', 'Reimagine the first-time investing experience for a 19-year-old.', '$1,000 cash', 10),
	('Lumen AI', 'AI/ML', 'Best assistant that helps hackers debug faster during the event itself.', '$1,200 + API credits', 11),
	('Cedar & Co', 'Education', 'Design a tool that makes group study sessions actually stick.', '$700 cash', 12),
	('Trailhead Robotics', 'Hardware', 'Best use of a microcontroller kit to solve an everyday annoyance.', '$1,000 + dev kits', 13);

INSERT INTO public.schedule_events (starts_at, title, type, location, sort_order) VALUES
	-- Day 1 · Sat Aug 8 · Online
	('2026-08-08T10:00:00-04:00', 'Opening ceremony (livestream)', 'Ceremony', 'All tracks · Zoom A', 1),
	('2026-08-08T11:00:00-04:00', 'Workshop: Intro to APIs', 'Workshop', 'Zoom A', 2),
	('2026-08-08T12:30:00-04:00', 'Team formation mixer', 'Social', 'All tracks · Zoom B', 3),
	('2026-08-08T13:30:00-04:00', 'Workshop: Designing your MVP', 'Workshop', 'Zoom A', 4),
	('2026-08-08T15:00:00-04:00', 'Sponsor tech talks', 'Talk', 'Zoom A', 5),
	('2026-08-08T17:00:00-04:00', 'Hacking begins', 'Milestone', 'All tracks', 6),
	('2026-08-08T20:00:00-04:00', 'Evening check-in / progress post', 'Milestone', 'Discord', 7),
	-- Day 2 · Sun Aug 9 · In-person
	('2026-08-09T08:00:00-04:00', 'Doors open + breakfast', 'Meal', 'The Yard', 8),
	('2026-08-09T09:00:00-04:00', 'Workshop: Pitching 101', 'Workshop', 'Container Row A', 9),
	('2026-08-09T10:00:00-04:00', 'Workshop: Polishing your demo', 'Workshop', 'Container Row B', 10),
	('2026-08-09T11:30:00-04:00', 'Sponsor booths open', 'Expo', 'Market Hall', 11),
	('2026-08-09T12:30:00-04:00', 'Lunch', 'Meal', 'The Yard', 12),
	('2026-08-09T14:00:00-04:00', 'Submission lock (Agorize)', 'Milestone', 'All tracks', 13),
	('2026-08-09T14:30:00-04:00', 'Judging window - round 1', 'Judging', 'Container Row A / B', 14),
	('2026-08-09T16:30:00-04:00', 'Judging window - finalists', 'Judging', 'Main Stage', 15),
	('2026-08-09T18:00:00-04:00', 'Closing ceremony + awards', 'Ceremony', 'Main Stage', 16),
	('2026-08-09T19:00:00-04:00', 'Dinner + send-off', 'Meal', 'The Yard', 17);

INSERT INTO public.announcements (channel, body, accent, created_at) VALUES
	('announcements', 'Breakfast is live in The Yard until 9:30 - grab something before workshops start.', 'var(--orange)', now() - interval '18 minutes'),
	('announcements', 'Sponsor booths in Market Hall open at 11:30. Bring questions for Fenwick Robotics and Cobalt Systems.', 'rgba(42,42,42,0.1)', now() - interval '50 minutes'),
	('logistics', 'Wifi network is "SummerHacks-Guest", password is on your lanyard.', 'rgba(42,42,42,0.1)', now() - interval '85 minutes'),
	('announcements', 'Reminder: submissions lock at 2:00 PM sharp on Agorize. No late submissions.', 'rgba(42,42,42,0.1)', now() - interval '120 minutes');

INSERT INTO public.map_zones (name, description, color, sort_order) VALUES
	('Main Stage', 'Opening/closing ceremonies, judging finals', 'var(--orange)', 1),
	('The Yard', 'Meals, outdoor lounge, team formation mixer', 'var(--green)', 2),
	('Container Row A', 'Workshops, judging round 1', 'var(--sun-300)', 3),
	('Container Row B', 'Workshops, judging round 1', 'var(--sun-300)', 4),
	('Market Hall', 'Sponsor booths', 'var(--blue)', 5),
	('Quiet Room', 'Container Row C - low-stimulation rest space', 'var(--purple)', 6),
	('Registration / check-in', 'QR check-in desk, volunteer help', 'var(--terracotta)', 7),
	('Washrooms', 'Near Container Row A and The Yard', 'var(--sun-400)', 8);
