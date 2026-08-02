-- Run this SQL in your Supabase Dashboard → SQL Editor
-- Run AFTER 0005_user_roles_table.sql and 0006_profile_provisioning.sql.
--
-- Adds "The Third Space Trek" — the team scavenger hunt described in
-- SummerHacks Scavenger Hunt.pdf. Hackers form a team, then once an hour log a
-- photo of the whole team working at a Toronto third space.
--
--   * scavenger_teams — display name (raw, capitalisation preserved) plus a
--     slug and a 6-character join code, both derived in-database. The slug is
--     the folder name inside the private `scavenger-hunt` storage bucket, so
--     the two can never be allowed to disagree: it is filled on insert and
--     pinned on update, exactly like profiles.nfc_id in 0004.
--   * scavenger_team_members — user_id is the PRIMARY KEY, which is what
--     enforces one team per hacker.
--   * scavenger_submissions — one row per logged photo. Points are NOT stored.
--     They are derived by a window function partitioned by (team, location),
--     so a team's first photo at a spot is worth 2 and later ones 1, per team
--     and independently of every other team. Deriving rather than storing is
--     what lets an organizer reject a photo after the fact and have the 2pt
--     discovery bonus re-flow onto that team's next surviving photo there.
--   * scavenger_settings — single-row config for the hunt window, the kill
--     switch, the cooldown and the point values. The window and the cooldown
--     are enforced by a trigger, not just by the UI.
--
-- join_code is a bearer credential: anyone who can read the column can join
-- any team. public.scavenger_teams is therefore never granted to
-- `authenticated` — every team read goes through a SECURITY DEFINER RPC that
-- returns only the caller's own code. `supabase.from("scavenger_teams")` will
-- always fail with permission denied, and that is deliberate.

-- =========================================================
-- Tables
--
-- Policies are grouped further down instead of sitting under each CREATE
-- TABLE: they call membership helpers that need these tables to exist first.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.scavenger_settings (
	-- Single-row table: the CHECK pins the key to `true` so a second row
	-- can never be inserted.
	id boolean PRIMARY KEY DEFAULT true CHECK (id),
	starts_at timestamptz NOT NULL,
	ends_at timestamptz NOT NULL,
	-- Manual kill switch, independent of the schedule.
	is_open boolean NOT NULL DEFAULT true,
	cooldown_minutes int NOT NULL DEFAULT 60,
	max_team_size int NOT NULL DEFAULT 4,
	new_spot_points int NOT NULL DEFAULT 2,
	repeat_spot_points int NOT NULL DEFAULT 1,
	updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scavenger_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.scavenger_locations (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text NOT NULL UNIQUE,
	area text NOT NULL DEFAULT '',
	tier text NOT NULL DEFAULT 'Free' CHECK (tier IN ('Free', 'Purchase')),
	notes text NOT NULL DEFAULT '',
	sort_order int NOT NULL DEFAULT 0,
	is_active boolean NOT NULL DEFAULT true,
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scavenger_locations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.scavenger_teams (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	-- The raw label as typed: capitalisation and spacing preserved.
	name text NOT NULL,
	-- Lowercase, dashes for spaces. The storage folder name. DB-owned.
	slug text NOT NULL UNIQUE,
	-- 6 characters, DB-owned. Never granted to `authenticated`.
	join_code text NOT NULL UNIQUE,
	created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scavenger_teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.scavenger_team_members (
	-- PRIMARY KEY on user_id is the "one team per hacker" rule.
	user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
	team_id uuid NOT NULL REFERENCES public.scavenger_teams(id) ON DELETE CASCADE,
	joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scavenger_team_members_team_id
	ON public.scavenger_team_members(team_id);

ALTER TABLE public.scavenger_team_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.scavenger_submissions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	team_id uuid NOT NULL REFERENCES public.scavenger_teams(id) ON DELETE CASCADE,
	-- Exactly one of these is set. A listed location can earn the 2pt
	-- discovery bonus; a free-text "somewhere else" never does.
	location_id uuid REFERENCES public.scavenger_locations(id) ON DELETE RESTRICT,
	custom_location text,
	submitted_by uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
	-- Object key inside the private `scavenger-hunt` bucket: "<slug>/<file>".
	photo_path text NOT NULL,
	-- Photos score the moment they land; organizers review afterwards and can
	-- reject, which removes the points and re-flows the discovery bonus.
	status text NOT NULL DEFAULT 'pending'
		CHECK (status IN ('pending', 'approved', 'rejected')),
	review_note text NOT NULL DEFAULT '',
	reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
	reviewed_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT scavenger_submissions_location_check CHECK (
		(location_id IS NOT NULL AND custom_location IS NULL)
		OR (location_id IS NULL AND length(btrim(custom_location)) > 0)
	)
);

CREATE INDEX IF NOT EXISTS idx_scavenger_submissions_team_created
	ON public.scavenger_submissions(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scavenger_submissions_team_location
	ON public.scavenger_submissions(team_id, location_id);
CREATE INDEX IF NOT EXISTS idx_scavenger_submissions_status
	ON public.scavenger_submissions(status);

ALTER TABLE public.scavenger_submissions ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- Slug and join code are derived in-database
--
-- The storage folder name is the slug, so a hacker must never be able to set
-- or change it, and a rename must never orphan a team's photos.
-- =========================================================

CREATE OR REPLACE FUNCTION public.scavenger_slugify(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
	SELECT NULLIF(
		btrim(
			regexp_replace(lower(btrim(p_name)), '[^a-z0-9]+', '-', 'g'),
			'-'
		),
		''
	);
$$;

-- 0/O and 1/I/L are omitted: hackers read these codes out loud to each other.
CREATE OR REPLACE FUNCTION public.scavenger_join_code()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = ''
AS $$
	SELECT string_agg(
		substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1),
		''
	)
	FROM generate_series(1, 6);
$$;

CREATE OR REPLACE FUNCTION public.scavenger_teams_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	candidate text;
	attempts int := 0;
BEGIN
	IF TG_OP = 'INSERT' THEN
		NEW.slug := public.scavenger_slugify(NEW.name);

		IF NEW.slug IS NULL THEN
			RAISE EXCEPTION 'Team name needs at least one letter or number.';
		END IF;

		LOOP
			attempts := attempts + 1;
			candidate := public.scavenger_join_code();

			EXIT WHEN NOT EXISTS (
				SELECT 1 FROM public.scavenger_teams AS t WHERE t.join_code = candidate
			);

			IF attempts > 20 THEN
				RAISE EXCEPTION 'Could not allocate a join code. Try again.';
			END IF;
		END LOOP;

		NEW.join_code := candidate;
	ELSE
		-- Renaming a team must never move its photo folder or reissue its PIN.
		NEW.slug := OLD.slug;
		NEW.join_code := OLD.join_code;
	END IF;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scavenger_teams_before_write ON public.scavenger_teams;

CREATE TRIGGER scavenger_teams_before_write
	BEFORE INSERT OR UPDATE ON public.scavenger_teams
	FOR EACH ROW
	EXECUTE FUNCTION public.scavenger_teams_before_write();

-- =========================================================
-- Membership helpers
--
-- SECURITY DEFINER so the storage.objects policies below can call them
-- without any grant on our tables. Both return NULL for a hacker with no
-- team, which makes every `=` comparison in a policy evaluate false.
-- =========================================================

CREATE OR REPLACE FUNCTION public.my_scavenger_team_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT m.team_id
	FROM public.scavenger_team_members AS m
	WHERE m.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.my_scavenger_team_slug()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT t.slug
	FROM public.scavenger_team_members AS m
	JOIN public.scavenger_teams AS t ON t.id = m.team_id
	WHERE m.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.my_scavenger_team_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_scavenger_team_slug() TO authenticated;

-- =========================================================
-- Submission guard — window, cooldown, membership, folder
--
-- All four rules live here rather than only in the server action, because the
-- action is not the only way a row could be inserted.
-- =========================================================

CREATE OR REPLACE FUNCTION public.scavenger_submissions_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	cfg public.scavenger_settings%ROWTYPE;
	team_slug text;
	last_at timestamptz;
	next_at timestamptz;
BEGIN
	IF TG_OP = 'UPDATE' THEN
		-- Review is the only thing an update may change. The evidence itself
		-- is immutable once logged.
		NEW.team_id := OLD.team_id;
		NEW.location_id := OLD.location_id;
		NEW.custom_location := OLD.custom_location;
		NEW.submitted_by := OLD.submitted_by;
		NEW.photo_path := OLD.photo_path;
		NEW.created_at := OLD.created_at;

		RETURN NEW;
	END IF;

	SELECT * INTO cfg FROM public.scavenger_settings WHERE id;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'The Third Space Trek has not been set up yet.';
	END IF;

	-- Locking the team row serialises concurrent inserts for one team, so two
	-- members tapping Submit at the same instant cannot both clear the
	-- cooldown check below.
	SELECT t.slug INTO team_slug
	FROM public.scavenger_teams AS t
	WHERE t.id = NEW.team_id
	FOR UPDATE;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'That team does not exist.';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM public.scavenger_team_members AS m
		WHERE m.user_id = NEW.submitted_by AND m.team_id = NEW.team_id
	) THEN
		RAISE EXCEPTION 'You are not on that team.';
	END IF;

	IF NOT cfg.is_open OR now() < cfg.starts_at OR now() >= cfg.ends_at THEN
		RAISE EXCEPTION 'The Third Space Trek is not open right now.';
	END IF;

	IF (string_to_array(NEW.photo_path, '/'))[1] IS DISTINCT FROM team_slug THEN
		RAISE EXCEPTION 'That photo is not in your team folder.';
	END IF;

	-- The cooldown counts every row, rejected ones included: having a photo
	-- thrown out must not hand the team a free extra slot.
	SELECT max(s.created_at) INTO last_at
	FROM public.scavenger_submissions AS s
	WHERE s.team_id = NEW.team_id;

	IF last_at IS NOT NULL THEN
		next_at := last_at + make_interval(mins => cfg.cooldown_minutes);

		IF now() < next_at THEN
			RAISE EXCEPTION 'One photo per % minutes. Your team can log the next one at %.',
				cfg.cooldown_minutes,
				to_char(next_at AT TIME ZONE 'America/Toronto', 'FMHH12:MI AM');
		END IF;
	END IF;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scavenger_submissions_before_write ON public.scavenger_submissions;

CREATE TRIGGER scavenger_submissions_before_write
	BEFORE INSERT OR UPDATE ON public.scavenger_submissions
	FOR EACH ROW
	EXECUTE FUNCTION public.scavenger_submissions_before_write();

-- =========================================================
-- Scoring — derived, never stored
--
-- row_number() PARTITION BY (team_id, location_id) is the entire rule: the
-- 2pt bonus is scoped to one team's own history at one location, so teams
-- never compete for a discovery and every team can earn 2pts at every spot.
-- =========================================================

CREATE OR REPLACE FUNCTION public.scavenger_leaderboard()
RETURNS TABLE (
	team_id uuid,
	team_name text,
	team_slug text,
	points bigint,
	photo_count bigint,
	spots_found bigint,
	last_logged_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	WITH cfg AS (
		SELECT s.new_spot_points, s.repeat_spot_points
		FROM public.scavenger_settings AS s
		WHERE s.id
	),
	scored AS (
		SELECT
			s.team_id,
			s.location_id,
			s.created_at,
			CASE
				-- "Somewhere else" never earns the discovery bonus.
				WHEN s.location_id IS NULL THEN (SELECT c.repeat_spot_points FROM cfg AS c)
				WHEN row_number() OVER (
					PARTITION BY s.team_id, s.location_id
					ORDER BY s.created_at, s.id
				) = 1 THEN (SELECT c.new_spot_points FROM cfg AS c)
				ELSE (SELECT c.repeat_spot_points FROM cfg AS c)
			END AS points
		FROM public.scavenger_submissions AS s
		WHERE s.status <> 'rejected'
	)
	SELECT
		t.id,
		t.name,
		t.slug,
		COALESCE(sum(sc.points), 0)::bigint,
		count(sc.created_at)::bigint,
		count(DISTINCT sc.location_id)::bigint,
		max(sc.created_at)
	FROM public.scavenger_teams AS t
	LEFT JOIN scored AS sc ON sc.team_id = t.id
	-- A SQL-language function cannot RAISE, so a caller without portal access
	-- simply sees an empty board.
	WHERE public.can_access_portal()
	GROUP BY t.id, t.name, t.slug
	ORDER BY 4 DESC, 7 ASC NULLS LAST, t.name;
$$;

-- One row per photo with what it scored. NULL means "my team"; staff may pass
-- any team id. Rejected rows stay visible at 0 points so a team can see what
-- happened, and are partitioned out of the ranking so the surviving photos
-- renumber as if the rejected one had never been logged.
CREATE OR REPLACE FUNCTION public.scavenger_team_submissions(p_team_id uuid DEFAULT NULL)
RETURNS TABLE (
	id uuid,
	team_id uuid,
	location_id uuid,
	location_name text,
	custom_location text,
	photo_path text,
	status text,
	review_note text,
	visit_number bigint,
	points int,
	created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	WITH target AS (
		SELECT CASE
			WHEN p_team_id IS NULL THEN public.my_scavenger_team_id()
			WHEN public.can_access_admin() THEN p_team_id
			ELSE NULL
		END AS team_id
	),
	cfg AS (
		SELECT s.new_spot_points, s.repeat_spot_points
		FROM public.scavenger_settings AS s
		WHERE s.id
	),
	scored AS (
		SELECT
			s.id,
			s.team_id,
			s.location_id,
			s.custom_location,
			s.photo_path,
			s.status,
			s.review_note,
			s.created_at,
			CASE
				WHEN s.status = 'rejected' OR s.location_id IS NULL THEN NULL
				ELSE row_number() OVER (
					PARTITION BY s.team_id, s.location_id, (s.status = 'rejected')
					ORDER BY s.created_at, s.id
				)
			END AS visit_number
		FROM public.scavenger_submissions AS s
		WHERE s.team_id = (SELECT tg.team_id FROM target AS tg)
	)
	SELECT
		sc.id,
		sc.team_id,
		sc.location_id,
		loc.name,
		sc.custom_location,
		sc.photo_path,
		sc.status,
		sc.review_note,
		sc.visit_number,
		CASE
			WHEN sc.status = 'rejected' THEN 0
			WHEN sc.location_id IS NULL THEN (SELECT c.repeat_spot_points FROM cfg AS c)
			WHEN sc.visit_number = 1 THEN (SELECT c.new_spot_points FROM cfg AS c)
			ELSE (SELECT c.repeat_spot_points FROM cfg AS c)
		END,
		sc.created_at
	FROM scored AS sc
	LEFT JOIN public.scavenger_locations AS loc ON loc.id = sc.location_id
	WHERE public.can_access_portal()
	ORDER BY sc.created_at DESC;
$$;

-- =========================================================
-- Team RPCs — the only way a hacker touches scavenger_teams
-- =========================================================

CREATE OR REPLACE FUNCTION public.scavenger_create_team(p_name text)
RETURNS TABLE (team_id uuid, team_name text, team_slug text, join_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	caller uuid := auth.uid();
	clean_name text := btrim(COALESCE(p_name, ''));
	new_team public.scavenger_teams%ROWTYPE;
BEGIN
	IF caller IS NULL OR NOT public.can_access_portal() THEN
		RAISE EXCEPTION 'Portal access required.';
	END IF;

	IF length(clean_name) < 2 OR length(clean_name) > 40 THEN
		RAISE EXCEPTION 'Team name must be 2 to 40 characters.';
	END IF;

	IF public.scavenger_slugify(clean_name) IS NULL THEN
		RAISE EXCEPTION 'Team name needs at least one letter or number.';
	END IF;

	IF EXISTS (
		SELECT 1 FROM public.scavenger_team_members AS m WHERE m.user_id = caller
	) THEN
		RAISE EXCEPTION 'You are already on a team. Leave it before creating another.';
	END IF;

	BEGIN
		INSERT INTO public.scavenger_teams (name, created_by)
		VALUES (clean_name, caller)
		RETURNING * INTO new_team;
	EXCEPTION WHEN unique_violation THEN
		-- Two names that slugify the same would share a storage folder.
		RAISE EXCEPTION 'That team name is taken - pick another.';
	END;

	INSERT INTO public.scavenger_team_members (user_id, team_id)
	VALUES (caller, new_team.id);

	RETURN QUERY SELECT new_team.id, new_team.name, new_team.slug, new_team.join_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.scavenger_join_team(p_join_code text)
RETURNS TABLE (team_id uuid, team_name text, team_slug text, join_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	caller uuid := auth.uid();
	-- Hackers type these off a phone screen: tolerate spaces, dashes, case.
	code text := upper(regexp_replace(COALESCE(p_join_code, ''), '[^A-Za-z0-9]', '', 'g'));
	found_team public.scavenger_teams%ROWTYPE;
	cap int;
	current_size int;
BEGIN
	IF caller IS NULL OR NOT public.can_access_portal() THEN
		RAISE EXCEPTION 'Portal access required.';
	END IF;

	IF EXISTS (
		SELECT 1 FROM public.scavenger_team_members AS m WHERE m.user_id = caller
	) THEN
		RAISE EXCEPTION 'You are already on a team. Leave it before joining another.';
	END IF;

	SELECT * INTO found_team
	FROM public.scavenger_teams AS t
	WHERE t.join_code = code
	FOR UPDATE;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'No team with that code.';
	END IF;

	SELECT s.max_team_size INTO cap FROM public.scavenger_settings AS s WHERE s.id;

	SELECT count(*) INTO current_size
	FROM public.scavenger_team_members AS m
	WHERE m.team_id = found_team.id;

	IF current_size >= COALESCE(cap, 4) THEN
		RAISE EXCEPTION 'Team "%" is full (% members).', found_team.name, COALESCE(cap, 4);
	END IF;

	INSERT INTO public.scavenger_team_members (user_id, team_id)
	VALUES (caller, found_team.id);

	RETURN QUERY SELECT found_team.id, found_team.name, found_team.slug, found_team.join_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.scavenger_leave_team()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	caller uuid := auth.uid();
	my_team uuid;
	remaining int;
BEGIN
	IF caller IS NULL OR NOT public.can_access_portal() THEN
		RAISE EXCEPTION 'Portal access required.';
	END IF;

	SELECT m.team_id INTO my_team
	FROM public.scavenger_team_members AS m
	WHERE m.user_id = caller;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'You are not on a team.';
	END IF;

	-- Points belong to the team, so a roster that has already scored is
	-- frozen: unpicking it would change a leaderboard other teams can see.
	IF EXISTS (
		SELECT 1 FROM public.scavenger_submissions AS s WHERE s.team_id = my_team
	) THEN
		RAISE EXCEPTION 'Your team has already logged photos - ask an organizer if you need to switch.';
	END IF;

	DELETE FROM public.scavenger_team_members AS m WHERE m.user_id = caller;

	SELECT count(*) INTO remaining
	FROM public.scavenger_team_members AS m
	WHERE m.team_id = my_team;

	-- Last one out frees the name and its slug for reuse.
	IF remaining = 0 THEN
		DELETE FROM public.scavenger_teams AS t WHERE t.id = my_team;
	END IF;
END;
$$;

-- The only path by which a hacker ever sees a join code — their own.
CREATE OR REPLACE FUNCTION public.scavenger_my_team()
RETURNS TABLE (
	team_id uuid,
	team_name text,
	team_slug text,
	join_code text,
	member_count int,
	members jsonb,
	last_logged_at timestamptz,
	next_allowed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT
		t.id,
		t.name,
		t.slug,
		t.join_code,
		(
			SELECT count(*)::int
			FROM public.scavenger_team_members AS m2
			WHERE m2.team_id = t.id
		),
		(
			SELECT COALESCE(jsonb_agg(p.full_name ORDER BY p.full_name), '[]'::jsonb)
			FROM public.scavenger_team_members AS m3
			JOIN public.profiles AS p ON p.user_id = m3.user_id
			WHERE m3.team_id = t.id
		),
		agg.last_at,
		agg.last_at + make_interval(
			mins => COALESCE(
				(SELECT c.cooldown_minutes FROM public.scavenger_settings AS c WHERE c.id),
				60
			)
		)
	FROM public.scavenger_team_members AS m
	JOIN public.scavenger_teams AS t ON t.id = m.team_id
	CROSS JOIN LATERAL (
		SELECT max(s.created_at) AS last_at
		FROM public.scavenger_submissions AS s
		WHERE s.team_id = t.id
	) AS agg
	WHERE m.user_id = auth.uid()
		AND public.can_access_portal();
$$;

-- =========================================================
-- Staff RPCs
-- =========================================================

CREATE OR REPLACE FUNCTION public.scavenger_admin_teams()
RETURNS TABLE (
	team_id uuid,
	team_name text,
	team_slug text,
	join_code text,
	member_count int,
	members jsonb,
	points bigint,
	photo_count bigint,
	last_logged_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT
		lb.team_id,
		lb.team_name,
		lb.team_slug,
		t.join_code,
		(
			SELECT count(*)::int
			FROM public.scavenger_team_members AS m
			WHERE m.team_id = t.id
		),
		(
			SELECT COALESCE(jsonb_agg(p.full_name ORDER BY p.full_name), '[]'::jsonb)
			FROM public.scavenger_team_members AS m2
			JOIN public.profiles AS p ON p.user_id = m2.user_id
			WHERE m2.team_id = t.id
		),
		lb.points,
		lb.photo_count,
		lb.last_logged_at
	FROM public.scavenger_leaderboard() AS lb
	JOIN public.scavenger_teams AS t ON t.id = lb.team_id
	WHERE public.can_access_admin();
$$;

CREATE OR REPLACE FUNCTION public.scavenger_update_settings(
	p_starts_local text,
	p_ends_local text,
	p_is_open boolean,
	p_cooldown_minutes int,
	p_max_team_size int,
	p_new_spot_points int,
	p_repeat_spot_points int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	starts timestamptz;
	ends timestamptz;
BEGIN
	IF NOT public.can_access_admin() THEN
		RAISE EXCEPTION 'Volunteer or organizer access required.';
	END IF;

	-- <input type="datetime-local"> hands back "2026-08-08T09:00" with no
	-- zone. This is a Toronto event, so read it as Toronto wall-clock time.
	starts := replace(p_starts_local, 'T', ' ')::timestamp AT TIME ZONE 'America/Toronto';
	ends := replace(p_ends_local, 'T', ' ')::timestamp AT TIME ZONE 'America/Toronto';

	IF ends <= starts THEN
		RAISE EXCEPTION 'The end time must be after the start time.';
	END IF;

	IF p_cooldown_minutes < 1 OR p_cooldown_minutes > 1440 THEN
		RAISE EXCEPTION 'Cooldown must be 1 to 1440 minutes.';
	END IF;

	IF p_max_team_size < 1 OR p_max_team_size > 20 THEN
		RAISE EXCEPTION 'Max team size must be 1 to 20.';
	END IF;

	IF p_new_spot_points < 0 OR p_repeat_spot_points < 0 THEN
		RAISE EXCEPTION 'Point values cannot be negative.';
	END IF;

	INSERT INTO public.scavenger_settings (
		id,
		starts_at,
		ends_at,
		is_open,
		cooldown_minutes,
		max_team_size,
		new_spot_points,
		repeat_spot_points,
		updated_at
	)
	VALUES (
		true,
		starts,
		ends,
		p_is_open,
		p_cooldown_minutes,
		p_max_team_size,
		p_new_spot_points,
		p_repeat_spot_points,
		now()
	)
	ON CONFLICT (id) DO UPDATE
	SET starts_at = EXCLUDED.starts_at,
		ends_at = EXCLUDED.ends_at,
		is_open = EXCLUDED.is_open,
		cooldown_minutes = EXCLUDED.cooldown_minutes,
		max_team_size = EXCLUDED.max_team_size,
		new_spot_points = EXCLUDED.new_spot_points,
		repeat_spot_points = EXCLUDED.repeat_spot_points,
		updated_at = now();
END;
$$;

-- =========================================================
-- Function grants
--
-- Every one of these re-checks the caller's role internally, so EXECUTE to
-- `authenticated` is safe. scavenger_join_code() is not granted: it is an
-- implementation detail of the insert trigger.
-- =========================================================

REVOKE ALL ON FUNCTION public.scavenger_join_code() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.scavenger_slugify(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.scavenger_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.scavenger_team_submissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.scavenger_create_team(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.scavenger_join_team(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.scavenger_leave_team() TO authenticated;
GRANT EXECUTE ON FUNCTION public.scavenger_my_team() TO authenticated;
GRANT EXECUTE ON FUNCTION public.scavenger_admin_teams() TO authenticated;
GRANT EXECUTE ON FUNCTION public.scavenger_update_settings(
	text, text, boolean, int, int, int, int
) TO authenticated;

-- =========================================================
-- Row level security
-- =========================================================

DROP POLICY IF EXISTS "Portal users can read trek settings" ON public.scavenger_settings;

CREATE POLICY "Portal users can read trek settings" ON public.scavenger_settings
	FOR SELECT TO authenticated
	USING (public.can_access_portal());

DROP POLICY IF EXISTS "Staff can manage trek settings" ON public.scavenger_settings;

CREATE POLICY "Staff can manage trek settings" ON public.scavenger_settings
	FOR ALL TO authenticated
	USING (public.can_access_admin())
	WITH CHECK (public.can_access_admin());

GRANT SELECT ON public.scavenger_settings TO authenticated;
GRANT ALL ON public.scavenger_settings TO service_role;

DROP POLICY IF EXISTS "Portal users can read trek locations" ON public.scavenger_locations;

CREATE POLICY "Portal users can read trek locations" ON public.scavenger_locations
	FOR SELECT TO authenticated
	USING (public.can_access_portal());

DROP POLICY IF EXISTS "Staff can manage trek locations" ON public.scavenger_locations;

CREATE POLICY "Staff can manage trek locations" ON public.scavenger_locations
	FOR ALL TO authenticated
	USING (public.can_access_admin())
	WITH CHECK (public.can_access_admin());

GRANT SELECT ON public.scavenger_locations TO authenticated;
GRANT ALL ON public.scavenger_locations TO service_role;

-- Deliberately no grant to `authenticated`: join_code is a bearer credential.
-- Hackers reach this table only through the SECURITY DEFINER RPCs above.
DROP POLICY IF EXISTS "Staff can manage trek teams" ON public.scavenger_teams;

CREATE POLICY "Staff can manage trek teams" ON public.scavenger_teams
	FOR ALL TO authenticated
	USING (public.can_access_admin())
	WITH CHECK (public.can_access_admin());

GRANT ALL ON public.scavenger_teams TO service_role;

DROP POLICY IF EXISTS "Portal users can read own team roster" ON public.scavenger_team_members;

CREATE POLICY "Portal users can read own team roster" ON public.scavenger_team_members
	FOR SELECT TO authenticated
	USING (
		public.can_access_portal()
		AND team_id = public.my_scavenger_team_id()
	);

DROP POLICY IF EXISTS "Staff can manage trek team members" ON public.scavenger_team_members;

CREATE POLICY "Staff can manage trek team members" ON public.scavenger_team_members
	FOR ALL TO authenticated
	USING (public.can_access_admin())
	WITH CHECK (public.can_access_admin());

-- No INSERT/DELETE for hackers: joining and leaving go through the RPCs, which
-- enforce the size cap and the one-team-per-hacker rule.
GRANT SELECT ON public.scavenger_team_members TO authenticated;
GRANT ALL ON public.scavenger_team_members TO service_role;

DROP POLICY IF EXISTS "Portal users can read own team photos" ON public.scavenger_submissions;

CREATE POLICY "Portal users can read own team photos" ON public.scavenger_submissions
	FOR SELECT TO authenticated
	USING (
		public.can_access_portal()
		AND team_id = public.my_scavenger_team_id()
	);

DROP POLICY IF EXISTS "Portal users can log own team photos" ON public.scavenger_submissions;

CREATE POLICY "Portal users can log own team photos" ON public.scavenger_submissions
	FOR INSERT TO authenticated
	WITH CHECK (
		public.can_access_portal()
		AND auth.uid() = submitted_by
		AND team_id = public.my_scavenger_team_id()
	);

DROP POLICY IF EXISTS "Staff can manage trek photos" ON public.scavenger_submissions;

CREATE POLICY "Staff can manage trek photos" ON public.scavenger_submissions
	FOR ALL TO authenticated
	USING (public.can_access_admin())
	WITH CHECK (public.can_access_admin());

-- No UPDATE or DELETE for hackers - a logged photo is immutable evidence.
GRANT SELECT, INSERT ON public.scavenger_submissions TO authenticated;
GRANT ALL ON public.scavenger_submissions TO service_role;

-- =========================================================
-- Storage — private bucket, one folder per team
--
-- The folder name is the team slug. Members can read and write inside their
-- own folder and nowhere else; staff get the whole bucket. There is no UPDATE
-- or DELETE policy for members, so a photo cannot be swapped after the fact.
-- =========================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
	'scavenger-hunt',
	'scavenger-hunt',
	false,
	10485760,
	ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
	file_size_limit = EXCLUDED.file_size_limit,
	allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Trek members read own team folder" ON storage.objects;

CREATE POLICY "Trek members read own team folder" ON storage.objects
	FOR SELECT TO authenticated
	USING (
		bucket_id = 'scavenger-hunt'
		AND (storage.foldername(name))[1] = public.my_scavenger_team_slug()
	);

DROP POLICY IF EXISTS "Trek members write own team folder" ON storage.objects;

CREATE POLICY "Trek members write own team folder" ON storage.objects
	FOR INSERT TO authenticated
	WITH CHECK (
		bucket_id = 'scavenger-hunt'
		AND public.can_access_portal()
		AND (storage.foldername(name))[1] = public.my_scavenger_team_slug()
	);

DROP POLICY IF EXISTS "Staff can manage the trek bucket" ON storage.objects;

CREATE POLICY "Staff can manage the trek bucket" ON storage.objects
	FOR ALL TO authenticated
	USING (bucket_id = 'scavenger-hunt' AND public.can_access_admin())
	WITH CHECK (bucket_id = 'scavenger-hunt' AND public.can_access_admin());

-- =========================================================
-- Seed — the spots from SummerHacks Scavenger Hunt.pdf
--
-- Suggestions, not a to-do list. Staff can add, retire (is_active = false) or
-- reorder them from the SQL editor at any point.
-- =========================================================

INSERT INTO public.scavenger_locations (name, area, tier, notes, sort_order)
VALUES
	('Milky''s Cloud Room', 'Inside Stackt', 'Purchase', '1 min walk', 1),
	('TPL Fort York Branch', 'Fort York Blvd', 'Free', '3 min walk', 2),
	('Waterworks Food Hall / The Well', 'Queen St, ~600m-1km', 'Free', '9-11 min walk', 3),
	('Botanic Coffee and Caphe', 'Queen St, ~600m', 'Purchase', '12 min walk', 4),
	('Scadding Court Community Ctr', 'Bathurst & Dundas', 'Free', '7 min walk', 5),
	('Fungo Cafe', 'King St W', 'Purchase', '7 min walk', 6),
	('Varda', 'King St W (TIFF)', 'Purchase', '8 min streetcar', 7),
	('ICHA TEA / Project Seoul / Cafe Foret', 'Chinatown', 'Purchase', '~8-12 min streetcar', 8),
	('TPL Lillian H. Smith Branch', 'College & Spadina', 'Free', '12 min streetcar', 9)
ON CONFLICT (name) DO NOTHING;

-- The hunt runs Saturday of the event weekend, standings lock at 11pm.
-- CONFIRM THIS BEFORE THE EVENT: the PDF says "all of Saturday", but
-- 0002_portal_tables.sql seeds Sat Aug 8 as the online day and Sun Aug 9 as
-- the in-person one. Whichever is right, set it from /admin/trek.
INSERT INTO public.scavenger_settings (id, starts_at, ends_at)
VALUES (
	true,
	'2026-08-08T09:00:00-04:00'::timestamptz,
	'2026-08-08T23:00:00-04:00'::timestamptz
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- Operational notes
-- =========================================================

-- Confirm the bucket is private:
--   SELECT id, public, file_size_limit FROM storage.buckets
--   WHERE id = 'scavenger-hunt';
--
-- Open or close the hunt by hand (the /admin/trek form does the same thing):
--   UPDATE public.scavenger_settings SET is_open = false;
--
-- Shorten the cooldown to test the flow end to end, then put it back:
--   UPDATE public.scavenger_settings SET cooldown_minutes = 2;
--   UPDATE public.scavenger_settings SET cooldown_minutes = 60;
--
-- Current standings, exactly as the portal shows them:
--   SELECT * FROM public.scavenger_leaderboard();
--
-- Look up a team that lost its join code:
--   SELECT team_name, join_code, members FROM public.scavenger_admin_teams();
--
-- Reject a photo. Points vanish and the 2pt discovery bonus re-flows onto
-- that team's next surviving photo at the same location - nothing else to do:
--   UPDATE public.scavenger_submissions
--   SET status = 'rejected', review_note = 'Only two of four in frame'
--   WHERE id = '<submission uuid>';
--
-- Photos whose row never landed (browser closed mid-upload). Harmless -
-- nothing reads or scores them - but this finds them for cleanup:
--   SELECT o.name, o.created_at
--   FROM storage.objects AS o
--   WHERE o.bucket_id = 'scavenger-hunt'
--     AND NOT EXISTS (
--       SELECT 1 FROM public.scavenger_submissions AS s
--       WHERE s.photo_path = o.name
--     );
--
-- If CREATE POLICY on storage.objects failed with "must be owner of table
-- objects", create the three policies from Dashboard -> Storage -> Policies
-- using the same predicates as above.
