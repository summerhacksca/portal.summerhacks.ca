-- Run this SQL in your Supabase Dashboard → SQL Editor
-- Run AFTER 0011_superadmin_enum.sql, 0005_user_roles_table.sql and
-- 0006_profile_provisioning.sql.
--
-- Adds staff self-service: organizers and superadmins can change roles and
-- post announcements from /admin/staff and /admin/announcements instead of
-- needing the service-role key.
--
-- Everything here is CREATE OR REPLACE / idempotent, so it converges a
-- database that already ran an earlier draft of 0003/0005/0006 with the
-- retro-edited versions of those files - re-running this file is safe.

-- =========================================================
-- a. Role helpers - re-apply in case this database predates the
-- retro-edited 0003_user_roles.sql / 0006_profile_provisioning.sql
-- =========================================================

CREATE OR REPLACE FUNCTION public.can_access_portal()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
	SELECT public.jwt_role() IN ('hacker', 'volunteer', 'organizer', 'superadmin');
$$;

CREATE OR REPLACE FUNCTION public.can_access_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
	SELECT public.jwt_role() IN ('volunteer', 'organizer', 'superadmin');
$$;

CREATE OR REPLACE FUNCTION public.is_organizer()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
	SELECT public.jwt_role() IN ('organizer', 'superadmin');
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
	SELECT public.jwt_role() = 'superadmin';
$$;

GRANT EXECUTE ON FUNCTION public.is_organizer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

CREATE OR REPLACE FUNCTION public.user_roles_create_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	IF NEW.role IN ('hacker', 'volunteer', 'organizer', 'superadmin') THEN
		PERFORM public.ensure_profile(NEW.user_id);
	END IF;

	RETURN NEW;
END;
$$;

-- =========================================================
-- b. Let admin_set_user_role() through the anti-self-elevation trigger
--
-- user_roles_before_write (0005_user_roles_table.sql) reverts any role change
-- made while the caller's Postgres role is 'authenticated' - and being
-- SECURITY DEFINER doesn't change that claim, so admin_set_user_role() below
-- would be silently reverted without this. The RPC sets a transaction-local
-- flag; the trigger only skips its revert when that flag is set. Direct
-- table writes stay impossible regardless: authenticated only ever holds
-- GRANT SELECT on public.user_roles.
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
		AND COALESCE(current_setting('app.role_write', true), '') <> 'on'
	THEN
		NEW.role := OLD.role;
	END IF;

	NEW.updated_at := now();
	RETURN NEW;
END;
$$;

-- =========================================================
-- c. admin_set_user_role - the RPC organizers/superadmins call from the app
--
-- Distinct RAISE EXCEPTION per rule so the server action can surface
-- error.message directly, the way app/admin/actions.ts already does for
-- other RPCs (e.g. scavenger_update_settings).
-- =========================================================

CREATE OR REPLACE FUNCTION public.admin_set_user_role(
	target_user_id uuid,
	new_role public.user_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	target_role public.user_role;
BEGIN
	IF NOT public.is_organizer() THEN
		RAISE EXCEPTION 'Organizer access required.';
	END IF;

	IF target_user_id = auth.uid() THEN
		RAISE EXCEPTION 'You cannot change your own role.';
	END IF;

	SELECT role INTO target_role FROM public.user_roles WHERE user_id = target_user_id;

	IF target_role IS NULL THEN
		RAISE EXCEPTION 'user % not found', target_user_id;
	END IF;

	IF target_role::text = 'superadmin' OR new_role::text = 'superadmin' THEN
		RAISE EXCEPTION 'Superadmin is set manually in the database.';
	END IF;

	IF NOT public.is_superadmin()
		AND (target_role = 'organizer' OR new_role = 'organizer')
	THEN
		RAISE EXCEPTION 'Only a superadmin can change organizer roles.';
	END IF;

	PERFORM set_config('app.role_write', 'on', true);

	INSERT INTO public.user_roles (user_id, role)
	VALUES (target_user_id, new_role)
	ON CONFLICT (user_id) DO UPDATE
	SET role = EXCLUDED.role, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, public.user_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.user_role) TO authenticated;

-- =========================================================
-- d. Announcements - let organizers/superadmins write, not just service_role
-- =========================================================

ALTER TABLE public.announcements
	ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Organizers can manage announcements" ON public.announcements;

CREATE POLICY "Organizers can manage announcements" ON public.announcements
	FOR ALL TO authenticated
	USING (public.is_organizer())
	WITH CHECK (public.is_organizer());

GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;

-- =========================================================
-- e. Bootstrap - the first superadmin
--
-- Run once, by hand, after finding the target's auth.users.id:
--
--   SELECT public.set_user_role('<uuid>', 'superadmin');
--
-- set_user_role() (0003/0005) runs as service_role in the SQL editor, so the
-- user_roles_before_write guard above does not apply to it.
-- =========================================================
