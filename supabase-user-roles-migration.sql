-- Run this SQL in your Supabase Dashboard → SQL Editor
--
-- Adds role-based access control for the SummerHacks portal.
--
-- Roles (stored in auth.users.raw_app_meta_data.role, serialized into the JWT
-- under `app_metadata.role`):
--   user       — default; cannot access /portal or /admin
--   hacker     — can access /portal
--   volunteer  — can access /portal and /admin
--   organizer  — can access /portal and /admin
--
-- We use app_metadata (not user_metadata) so end users cannot elevate their own
-- role. Promote users with public.set_user_role() using the service role.
--
-- After running this migration, enforce route-level access in the Next.js proxy
-- (proxy.ts) by reading `session.user.app_metadata.role` from the JWT.

-- =========================================================
-- Role enum + JWT helpers
-- =========================================================

CREATE TYPE public.user_role AS ENUM (
	'user',
	'hacker',
	'volunteer',
	'organizer'
);

-- Read the caller's role from the JWT (defaults to 'user' when missing).
CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
	SELECT COALESCE(
		auth.jwt() -> 'app_metadata' ->> 'role',
		'user'
	);
$$;

CREATE OR REPLACE FUNCTION public.can_access_portal()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
	SELECT public.jwt_role() IN ('hacker', 'volunteer', 'organizer');
$$;

CREATE OR REPLACE FUNCTION public.can_access_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
	SELECT public.jwt_role() IN ('volunteer', 'organizer');
$$;

GRANT EXECUTE ON FUNCTION public.jwt_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_portal() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_admin() TO authenticated;

-- =========================================================
-- Default role for new sign-ups (BEFORE INSERT on auth.users)
-- =========================================================

CREATE OR REPLACE FUNCTION public.set_default_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	IF NEW.raw_app_meta_data IS NULL THEN
		NEW.raw_app_meta_data := '{}'::jsonb;
	END IF;

	IF NEW.raw_app_meta_data ->> 'role' IS NULL THEN
		NEW.raw_app_meta_data :=
			NEW.raw_app_meta_data || jsonb_build_object('role', 'user');
	END IF;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_default_user_role ON auth.users;

CREATE TRIGGER set_default_user_role
	BEFORE INSERT ON auth.users
	FOR EACH ROW
	EXECUTE FUNCTION public.set_default_user_role();

-- =========================================================
-- Backfill: existing accounts without a role become 'user'
-- =========================================================

UPDATE auth.users
SET raw_app_meta_data =
	COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'user')
WHERE raw_app_meta_data ->> 'role' IS NULL;

-- =========================================================
-- Service-role helper to promote / demote users
-- (e.g. accepted hackers → 'hacker', staff → 'volunteer'/'organizer')
-- =========================================================

CREATE OR REPLACE FUNCTION public.set_user_role(
	target_user_id uuid,
	new_role public.user_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	UPDATE auth.users
	SET raw_app_meta_data =
		COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role::text)
	WHERE id = target_user_id;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'user % not found', target_user_id;
	END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.user_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.user_role) TO service_role;

-- =========================================================
-- Portal RLS — require hacker / volunteer / organizer
-- (run after supabase-portal-migration.sql)
-- =========================================================

-- profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Portal users can read own profile" ON public.profiles
	FOR SELECT TO authenticated
	USING (auth.uid() = user_id AND public.can_access_portal());

CREATE POLICY "Portal users can insert own profile" ON public.profiles
	FOR INSERT TO authenticated
	WITH CHECK (auth.uid() = user_id AND public.can_access_portal());

CREATE POLICY "Portal users can update own profile" ON public.profiles
	FOR UPDATE TO authenticated
	USING (auth.uid() = user_id AND public.can_access_portal())
	WITH CHECK (auth.uid() = user_id AND public.can_access_portal());

-- tracks
DROP POLICY IF EXISTS "Authenticated users can read tracks" ON public.tracks;

CREATE POLICY "Portal users can read tracks" ON public.tracks
	FOR SELECT TO authenticated
	USING (public.can_access_portal());

-- sponsors
DROP POLICY IF EXISTS "Authenticated users can read sponsors" ON public.sponsors;

CREATE POLICY "Portal users can read sponsors" ON public.sponsors
	FOR SELECT TO authenticated
	USING (public.can_access_portal());

-- schedule_events
DROP POLICY IF EXISTS "Authenticated users can read schedule" ON public.schedule_events;

CREATE POLICY "Portal users can read schedule" ON public.schedule_events
	FOR SELECT TO authenticated
	USING (public.can_access_portal());

-- announcements
DROP POLICY IF EXISTS "Authenticated users can read announcements" ON public.announcements;

CREATE POLICY "Portal users can read announcements" ON public.announcements
	FOR SELECT TO authenticated
	USING (public.can_access_portal());

-- map_zones
DROP POLICY IF EXISTS "Authenticated users can read map zones" ON public.map_zones;

CREATE POLICY "Portal users can read map zones" ON public.map_zones
	FOR SELECT TO authenticated
	USING (public.can_access_portal());

-- =========================================================
-- Future /admin tables — use this pattern when you add them:
--
--   CREATE POLICY "Staff can read …" ON public.<table>
--     FOR SELECT TO authenticated
--     USING (public.can_access_admin());
--
--   CREATE POLICY "Staff can write …" ON public.<table>
--     FOR ALL TO authenticated
--     USING (public.can_access_admin())
--     WITH CHECK (public.can_access_admin());
-- =========================================================
