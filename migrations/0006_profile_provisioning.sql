-- Run this SQL in your Supabase Dashboard → SQL Editor
-- Run AFTER 0004_event_checkin.sql and 0005_user_roles_table.sql.
--
-- Makes public.profiles DB-owned instead of app-created.
--
-- Until now a profile row was created lazily by the app on the hacker's first
-- /portal visit, so an accepted hacker who had signed in but never opened the
-- portal had no profile - and therefore no nfc_id, no QR code, and no row on
-- /admin/nfc-tags for an organizer to write a tag from.
--
-- After this migration the row is created the moment an account's role becomes
-- hacker / volunteer / organizer, so public.profiles contains exactly the set of
-- portal users that public.can_access_portal() admits. nfc_id comes along for
-- free: the profiles_set_nfc_id trigger from 0004 fills it on insert.
--
-- Because the database now owns row creation and the email column, authenticated
-- loses INSERT entirely and keeps UPDATE only on the fields the profile form
-- edits.
--
-- OPERATIONAL NOTE: promote users only with public.set_user_role(). Editing
-- auth.users.raw_app_meta_data.role by hand in the Dashboard bypasses
-- public.user_roles, which grants portal access without provisioning a profile -
-- exactly the bug this migration closes.

-- =========================================================
-- Housekeeping - converge the nfc_id trigger on one name
--
-- An earlier draft of 0004 named this trigger profiles_before_write; the
-- committed 0004 names it profiles_set_nfc_id. Depending on which drafts a
-- database has seen it may have either, both (two identical BEFORE triggers),
-- or the function under one name with no trigger at all.
--
-- Drop every variant, then recreate the canonical pair. The function body is
-- reproduced verbatim from 0004 so this converges from any of those states.
-- =========================================================

DROP TRIGGER IF EXISTS profiles_before_write ON public.profiles;
DROP TRIGGER IF EXISTS profiles_set_nfc_id ON public.profiles;

DROP FUNCTION IF EXISTS public.profiles_before_write();

CREATE OR REPLACE FUNCTION public.profiles_set_nfc_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	IF TG_OP = 'INSERT' THEN
		NEW.nfc_id := public.generate_nfc_id(NEW.user_id);
	ELSIF NEW.nfc_id IS DISTINCT FROM OLD.nfc_id
		AND COALESCE(auth.jwt() ->> 'role', '') = 'authenticated'
	THEN
		NEW.nfc_id := OLD.nfc_id;
	END IF;

	RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_nfc_id
	BEFORE INSERT OR UPDATE ON public.profiles
	FOR EACH ROW
	EXECUTE FUNCTION public.profiles_set_nfc_id();

-- =========================================================
-- public.ensure_profile - create a portal user's profile if it is missing
--
-- SECURITY DEFINER so it can read auth.users and so the insert runs as the
-- table owner, bypassing RLS (the same mechanism auth_users_create_role()
-- already relies on to write public.user_roles).
--
-- nfc_id is deliberately not mentioned: the profiles_set_nfc_id BEFORE INSERT
-- trigger derives it, and that is the only place it is ever set.
-- =========================================================

CREATE OR REPLACE FUNCTION public.ensure_profile(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
	INSERT INTO public.profiles (user_id, email, full_name)
	SELECT
		u.id,
		-- profiles.email is NOT NULL but auth.users.email is nullable.
		COALESCE(u.email, ''),
		COALESCE(
			u.raw_user_meta_data ->> 'full_name',
			u.raw_user_meta_data ->> 'name',
			''
		)
	FROM auth.users AS u
	WHERE u.id = p_user_id
	ON CONFLICT (user_id) DO NOTHING;
$$;

REVOKE ALL ON FUNCTION public.ensure_profile(uuid) FROM PUBLIC, anon, authenticated;

-- =========================================================
-- Provision on promotion - AFTER INSERT OR UPDATE OF role ON user_roles
--
-- Kept separate from user_roles_sync_to_auth (0005): that trigger's job is
-- keeping the JWT claim in sync, this one's is provisioning.
--
-- set_user_role() does INSERT … ON CONFLICT DO UPDATE SET role, so both the
-- first promotion and every later one land here. ensure_profile is idempotent,
-- so re-running a promotion is free.
-- =========================================================

CREATE OR REPLACE FUNCTION public.user_roles_create_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	IF NEW.role IN ('hacker', 'volunteer', 'organizer') THEN
		PERFORM public.ensure_profile(NEW.user_id);
	END IF;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_create_profile ON public.user_roles;

CREATE TRIGGER user_roles_create_profile
	AFTER INSERT OR UPDATE OF role ON public.user_roles
	FOR EACH ROW
	EXECUTE FUNCTION public.user_roles_create_profile();

-- =========================================================
-- Backfill - every account that already has portal access
--
-- This is the statement that makes /admin/nfc-tags complete: hackers who were
-- promoted before this migration but never opened the portal get a profile, and
-- the nfc_id trigger fires per row to give them a tag ID.
-- =========================================================

INSERT INTO public.profiles (user_id, email, full_name)
SELECT
	u.id,
	COALESCE(u.email, ''),
	COALESCE(
		u.raw_user_meta_data ->> 'full_name',
		u.raw_user_meta_data ->> 'name',
		''
	)
FROM auth.users AS u
JOIN public.user_roles AS ur ON ur.user_id = u.id
WHERE ur.role IN ('hacker', 'volunteer', 'organizer')
ON CONFLICT (user_id) DO NOTHING;

-- =========================================================
-- Lock down writes
--
-- 0002_portal_tables.sql granted table-wide INSERT and UPDATE on profiles to
-- authenticated, and the RLS policies only check auth.uid() = user_id. That let
-- a hacker PATCH their own email - the address a volunteer reads off the
-- check-in page to confirm they are scanning the right person.
--
-- Nothing needs INSERT any more, and column-level grants pin email, nfc_id,
-- user_id, avatar_url and the timestamps at the privilege layer. The nfc_id
-- branch in profiles_set_nfc_id() stays as belt and braces.
--
-- The granted columns are exactly what updateProfile() in app/portal/actions.ts
-- sends.
-- =========================================================

DROP POLICY IF EXISTS "Portal users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (full_name, team_name, school, tracks, updated_at)
	ON public.profiles TO authenticated;

-- =========================================================
-- Keep profiles.email fresh
--
-- The app can no longer write email, so the database has to maintain it -
-- otherwise a Supabase email-change flow would leave profiles.email stale with
-- no way to correct it.
-- =========================================================

CREATE OR REPLACE FUNCTION public.auth_users_sync_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	UPDATE public.profiles
	SET email = COALESCE(NEW.email, ''), updated_at = now()
	WHERE user_id = NEW.id;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auth_users_sync_email ON auth.users;

CREATE TRIGGER auth_users_sync_email
	AFTER UPDATE OF email ON auth.users
	FOR EACH ROW
	EXECUTE FUNCTION public.auth_users_sync_email();

-- One-time reconciliation for addresses that drifted before the trigger existed.
UPDATE public.profiles AS p
SET email = COALESCE(u.email, ''), updated_at = now()
FROM auth.users AS u
WHERE u.id = p.user_id
	AND p.email IS DISTINCT FROM COALESCE(u.email, '');
