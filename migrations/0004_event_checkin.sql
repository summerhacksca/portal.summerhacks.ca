-- Run this SQL in your Supabase Dashboard → SQL Editor
-- Run AFTER 0002_portal_tables.sql and 0003_user_roles.sql.
--
-- Adds the event check-in system:
--   * profiles.nfc_id - opaque per-hacker ID, derived in-database via HMAC.
--     Both the hacker's QR code and their NFC tag encode the same URL,
--     https://<origin>/admin/checkin/<nfc_id>, which only volunteers and
--     organizers can open (enforced by proxy.ts + can_access_admin()).
--   * schedule_events.check_in_required - check-in only applies to meals and
--     registration. Enforced by a trigger, not just by the UI.
--   * event_checkins - junction table, one row per (event, hacker).
--
-- The HMAC secret is generated in-database and stored in private.nfc_config,
-- so there is no new environment variable to keep in sync across local,
-- preview, and production.

-- =========================================================
-- Secret store - private schema, unreachable from the Data API
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS private.nfc_config (
	-- Single-row table: the CHECK pins the key to `true` so a second row
	-- can never be inserted.
	id boolean PRIMARY KEY DEFAULT true CHECK (id),
	secret text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.nfc_config ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON private.nfc_config FROM anon, authenticated;

-- Generated here so the secret is never typed by a human and never leaves the DB.
INSERT INTO private.nfc_config (secret)
VALUES (encode(extensions.gen_random_bytes(32), 'base64'))
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- NFC ID derivation
--
-- Byte-identical to the reference implementation this port is based on:
--   crypto.createHmac("sha256", secret)
--     .update(`nfc:v1:${userId}`, "utf8")
--     .digest("base64url")
--     .slice(0, 16)
--
-- Postgres has no base64url encoder, so we encode base64 and translate the
-- two differing characters. A 32-byte digest is 44 base64 characters, well
-- under the 76-character mark where encode() would insert a newline.
-- =========================================================

CREATE OR REPLACE FUNCTION public.generate_nfc_id(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT left(
		translate(
			encode(
				extensions.hmac(
					'nfc:v1:' || p_user_id::text,
					(SELECT secret FROM private.nfc_config),
					'sha256'
				),
				'base64'
			),
			'+/',
			'-_'
		),
		16
	);
$$;

-- Never expose this as an RPC: anyone who could call it would be able to
-- derive another hacker's tag ID straight from their user_id.
REVOKE ALL ON FUNCTION public.generate_nfc_id(uuid) FROM PUBLIC, anon, authenticated;

-- =========================================================
-- profiles.nfc_id
-- =========================================================

ALTER TABLE public.profiles
	ADD COLUMN IF NOT EXISTS nfc_id text;

-- Backfill existing hackers before the column is made NOT NULL. Runs before
-- the trigger exists, so there is no interaction between the two.
UPDATE public.profiles
SET nfc_id = public.generate_nfc_id(user_id)
WHERE nfc_id IS NULL;

ALTER TABLE public.profiles
	ALTER COLUMN nfc_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_nfc_id ON public.profiles(nfc_id);

-- 0002_portal_tables.sql grants table-wide UPDATE on profiles to
-- `authenticated`, so without this trigger a hacker could PATCH their own
-- nfc_id and check in as somebody else. The column is DB-owned: filled on
-- insert, pinned on update. The service role can still rotate a tag.
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

DROP TRIGGER IF EXISTS profiles_set_nfc_id ON public.profiles;

CREATE TRIGGER profiles_set_nfc_id
	BEFORE INSERT OR UPDATE ON public.profiles
	FOR EACH ROW
	EXECUTE FUNCTION public.profiles_set_nfc_id();

-- Volunteers and organizers need to read the hacker behind a scanned tag.
DROP POLICY IF EXISTS "Staff can read all profiles" ON public.profiles;

CREATE POLICY "Staff can read all profiles" ON public.profiles
	FOR SELECT TO authenticated
	USING (public.can_access_admin());

-- =========================================================
-- schedule_events.check_in_required
--
-- Check-in applies to meals and registration only.
-- =========================================================

ALTER TABLE public.schedule_events
	ADD COLUMN IF NOT EXISTS check_in_required boolean NOT NULL DEFAULT false;

-- 'Registration' is a new event type.
ALTER TABLE public.schedule_events
	DROP CONSTRAINT IF EXISTS schedule_events_type_check;

ALTER TABLE public.schedule_events
	ADD CONSTRAINT schedule_events_type_check CHECK (type IN (
		'Workshop',
		'Meal',
		'Judging',
		'Ceremony',
		'Social',
		'Talk',
		'Expo',
		'Milestone',
		'Registration'
	));

-- Day 2 (Sun Aug 9) is the in-person day; registration opens before breakfast.
INSERT INTO public.schedule_events (starts_at, title, type, location, sort_order)
SELECT
	'2026-08-09T07:45:00-04:00'::timestamptz,
	'Registration / check-in',
	'Registration',
	'Registration desk · near Main Stage',
	8
WHERE NOT EXISTS (
	SELECT 1 FROM public.schedule_events WHERE type = 'Registration'
);

UPDATE public.schedule_events
SET check_in_required = true
WHERE type IN ('Meal', 'Registration');

-- =========================================================
-- public.event_checkins - junction table, one row per (event, hacker)
--
-- Undo flips `checked_in` rather than deleting the row, so the audit trail
-- (who scanned, when) survives.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.event_checkins (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	event_id uuid NOT NULL REFERENCES public.schedule_events(id) ON DELETE CASCADE,
	user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
	checked_in boolean NOT NULL DEFAULT true,
	checked_in_at timestamptz NOT NULL DEFAULT now(),
	checked_in_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_checkins_user_id ON public.event_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_event_id ON public.event_checkins(event_id);

-- The meals-and-registration rule lives in the database, not only in the UI.
CREATE OR REPLACE FUNCTION public.event_checkins_require_check_in()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	event_title text;
	required boolean;
BEGIN
	SELECT title, check_in_required
	INTO event_title, required
	FROM public.schedule_events
	WHERE id = NEW.event_id;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'event % does not exist', NEW.event_id;
	END IF;

	IF NOT required THEN
		RAISE EXCEPTION 'event "%" does not require check-in', event_title;
	END IF;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS event_checkins_require_check_in ON public.event_checkins;

CREATE TRIGGER event_checkins_require_check_in
	BEFORE INSERT OR UPDATE ON public.event_checkins
	FOR EACH ROW
	EXECUTE FUNCTION public.event_checkins_require_check_in();

ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

-- Hackers see their own check-in history and nothing else.
CREATE POLICY "Portal users can read own check-ins" ON public.event_checkins
	FOR SELECT TO authenticated
	USING (auth.uid() = user_id AND public.can_access_portal());

-- Volunteers and organizers run check-in.
CREATE POLICY "Staff can manage check-ins" ON public.event_checkins
	FOR ALL TO authenticated
	USING (public.can_access_admin())
	WITH CHECK (public.can_access_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_checkins TO authenticated;
GRANT ALL ON public.event_checkins TO service_role;

-- =========================================================
-- Retire the old self-serve check-in flag
--
-- profiles.checked_in / checked_in_at were toggled by hackers themselves.
-- Overall check-in status is now derived from an event_checkins row against
-- the 'Registration' event, so there is a single source of truth.
--
-- Skip this section on a first run if you would rather keep the old columns
-- around until the new flow is verified; nothing else in this file depends
-- on them being dropped.
-- =========================================================

ALTER TABLE public.profiles
	DROP COLUMN IF EXISTS checked_in,
	DROP COLUMN IF EXISTS checked_in_at;
