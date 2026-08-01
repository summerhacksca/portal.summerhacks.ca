-- Run this SQL in your Supabase Dashboard → SQL Editor
-- Run AFTER 0003_user_roles.sql and 0004_event_checkin.sql.
--
-- Adds public.user_roles as the source of truth for portal access (one row per
-- auth.users.id). Changes are pushed into auth.users.raw_app_meta_data (and
-- therefore the JWT) by an AFTER trigger. Promote users with
-- public.set_user_role().

-- =========================================================
-- Tear down profiles.role approach if an earlier draft was applied
-- =========================================================

DROP TRIGGER IF EXISTS profiles_sync_role_to_auth ON public.profiles;
DROP FUNCTION IF EXISTS public.profiles_sync_role_to_auth();
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- =========================================================
-- public.user_roles - one row per auth account
-- =========================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
	user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
	role public.user_role NOT NULL DEFAULT 'user',
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own role" ON public.user_roles
	FOR SELECT TO authenticated
	USING (auth.uid() = user_id);

CREATE POLICY "Staff can read all roles" ON public.user_roles
	FOR SELECT TO authenticated
	USING (public.can_access_admin());

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- =========================================================
-- BEFORE write - authenticated users cannot self-elevate
-- =========================================================

CREATE OR REPLACE FUNCTION public.user_roles_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	IF TG_OP = 'UPDATE'
		AND NEW.role IS DISTINCT FROM OLD.role
		AND COALESCE(auth.jwt() ->> 'role', '') = 'authenticated'
	THEN
		NEW.role := OLD.role;
	END IF;

	NEW.updated_at := now();
	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_before_write ON public.user_roles;

CREATE TRIGGER user_roles_before_write
	BEFORE INSERT OR UPDATE ON public.user_roles
	FOR EACH ROW
	EXECUTE FUNCTION public.user_roles_before_write();

-- =========================================================
-- AFTER write - sync user_roles.role → auth.users.raw_app_meta_data
-- =========================================================

CREATE OR REPLACE FUNCTION public.user_roles_sync_to_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	UPDATE auth.users
	SET raw_app_meta_data =
		COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role::text)
	WHERE id = NEW.user_id;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_sync_to_auth ON public.user_roles;

CREATE TRIGGER user_roles_sync_to_auth
	AFTER INSERT OR UPDATE OF role ON public.user_roles
	FOR EACH ROW
	EXECUTE FUNCTION public.user_roles_sync_to_auth();

-- =========================================================
-- New sign-ups - create a user_roles row (replaces set_default_user_role)
-- =========================================================

CREATE OR REPLACE FUNCTION public.auth_users_create_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	INSERT INTO public.user_roles (user_id)
	VALUES (NEW.id)
	ON CONFLICT (user_id) DO NOTHING;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_default_user_role ON auth.users;
DROP FUNCTION IF EXISTS public.set_default_user_role();

DROP TRIGGER IF EXISTS auth_users_create_role ON auth.users;

CREATE TRIGGER auth_users_create_role
	AFTER INSERT ON auth.users
	FOR EACH ROW
	EXECUTE FUNCTION public.auth_users_create_role();

-- =========================================================
-- Backfill - every existing auth.users account gets a row
-- =========================================================

INSERT INTO public.user_roles (user_id, role)
SELECT
	u.id,
	COALESCE(
		NULLIF(u.raw_app_meta_data ->> 'role', '')::public.user_role,
		'user'::public.user_role
	)
FROM auth.users AS u
ON CONFLICT (user_id) DO UPDATE
SET
	role = EXCLUDED.role,
	updated_at = now();

-- One-time sync so metadata matches the backfilled table.
UPDATE auth.users AS u
SET raw_app_meta_data =
	COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', ur.role::text)
FROM public.user_roles AS ur
WHERE ur.user_id = u.id;

-- =========================================================
-- profiles_before_write - nfc_id only (from 0004_event_checkin.sql)
-- =========================================================

CREATE OR REPLACE FUNCTION public.profiles_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	IF TG_OP = 'INSERT' THEN
		NEW.nfc_id := public.generate_nfc_id(NEW.user_id);
	ELSIF TG_OP = 'UPDATE'
		AND NEW.nfc_id IS DISTINCT FROM OLD.nfc_id
		AND COALESCE(auth.jwt() ->> 'role', '') = 'authenticated'
	THEN
		NEW.nfc_id := OLD.nfc_id;
	END IF;

	RETURN NEW;
END;
$$;

-- =========================================================
-- set_user_role - write through user_roles
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
	IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
		RAISE EXCEPTION 'user % not found', target_user_id;
	END IF;

	INSERT INTO public.user_roles (user_id, role)
	VALUES (target_user_id, new_role)
	ON CONFLICT (user_id) DO UPDATE
	SET role = EXCLUDED.role, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.user_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.user_role) TO service_role;
