-- Trek admin is organizer/superadmin only. Volunteers keep check-in access
-- via can_access_admin() on event_checkins and profiles; trek tables and the
-- scavenger-hunt bucket now require is_organizer() instead.

-- =========================================================
-- RPCs
-- =========================================================

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
			WHEN public.is_organizer() THEN p_team_id
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
	WHERE public.is_organizer();
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
	IF NOT public.is_organizer() THEN
		RAISE EXCEPTION 'Organizer access required.';
	END IF;

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
	ON CONFLICT (id) DO UPDATE SET
		starts_at = EXCLUDED.starts_at,
		ends_at = EXCLUDED.ends_at,
		is_open = EXCLUDED.is_open,
		cooldown_minutes = EXCLUDED.cooldown_minutes,
		max_team_size = EXCLUDED.max_team_size,
		new_spot_points = EXCLUDED.new_spot_points,
		repeat_spot_points = EXCLUDED.repeat_spot_points,
		updated_at = EXCLUDED.updated_at;
END;
$$;

-- =========================================================
-- RLS policies
-- =========================================================

DROP POLICY IF EXISTS "Staff can manage trek settings" ON public.scavenger_settings;
CREATE POLICY "Organizers can manage trek settings" ON public.scavenger_settings
	FOR ALL TO authenticated
	USING (public.is_organizer())
	WITH CHECK (public.is_organizer());

DROP POLICY IF EXISTS "Staff can manage trek locations" ON public.scavenger_locations;
CREATE POLICY "Organizers can manage trek locations" ON public.scavenger_locations
	FOR ALL TO authenticated
	USING (public.is_organizer())
	WITH CHECK (public.is_organizer());

DROP POLICY IF EXISTS "Staff can manage trek teams" ON public.scavenger_teams;
CREATE POLICY "Organizers can manage trek teams" ON public.scavenger_teams
	FOR ALL TO authenticated
	USING (public.is_organizer())
	WITH CHECK (public.is_organizer());

DROP POLICY IF EXISTS "Staff can manage trek team members" ON public.scavenger_team_members;
CREATE POLICY "Organizers can manage trek team members" ON public.scavenger_team_members
	FOR ALL TO authenticated
	USING (public.is_organizer())
	WITH CHECK (public.is_organizer());

DROP POLICY IF EXISTS "Staff can manage trek photos" ON public.scavenger_submissions;
CREATE POLICY "Organizers can manage trek photos" ON public.scavenger_submissions
	FOR ALL TO authenticated
	USING (public.is_organizer())
	WITH CHECK (public.is_organizer());

DROP POLICY IF EXISTS "Staff can manage the trek bucket" ON storage.objects;
CREATE POLICY "Organizers can manage the trek bucket" ON storage.objects
	FOR ALL TO authenticated
	USING (bucket_id = 'scavenger-hunt' AND public.is_organizer())
	WITH CHECK (bucket_id = 'scavenger-hunt' AND public.is_organizer());
