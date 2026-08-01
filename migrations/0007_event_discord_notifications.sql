-- Run this SQL in your Supabase Dashboard → SQL Editor
-- Run AFTER 0006_profile_provisioning.sql.
--
-- Adds Discord "starting soon" notifications for public.schedule_events,
-- using a "dumb cron → smart API" architecture:
--   * pg_cron ticks every 5 minutes and does nothing but call
--     private.notify_upcoming_events(), which fires one net.http_post at the
--     Next.js route below. All the real logic (which events are due, embed
--     formatting, marking rows sent) lives in app/api/events/notify/route.ts —
--     Postgres stays a scheduler, not an application.
--   * The shared secret and target URL live in private.notify_config, a
--     locked-down single-row table — same shape as private.nfc_config from
--     0004_event_checkin.sql. Rotating the secret or repointing the URL at
--     production is a one-line UPDATE, no redeploy of this migration needed.
--
-- Idempotent: safe to re-run.

-- =========================================================
-- schedule_events.discord_notified
--
-- 0002_portal_tables.sql grants `authenticated` SELECT-only on
-- schedule_events, so hackers can read this flag but never write it — only
-- the service-role route (via private.notify_config's secret) can flip it.
-- =========================================================

ALTER TABLE public.schedule_events
	ADD COLUMN IF NOT EXISTS discord_notified boolean NOT NULL DEFAULT false;

-- The claim query in the API route only ever looks at un-notified rows.
CREATE INDEX IF NOT EXISTS idx_schedule_events_discord_pending
	ON public.schedule_events (starts_at)
	WHERE NOT discord_notified;

-- =========================================================
-- private.notify_config — the cron job's credentials
--
-- Single-row table: the CHECK pins the key to `true` so a second row can
-- never be inserted. Mirrors private.nfc_config.
-- =========================================================

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS private.notify_config (
	id boolean PRIMARY KEY DEFAULT true CHECK (id),
	api_base_url text NOT NULL,
	cron_secret text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.notify_config ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON private.notify_config FROM anon, authenticated;

-- Generated here so the secret is never typed by a human and never leaves
-- the DB until copied into CRON_SECRET (see the trailing comment block).
-- hex, not base64: no +/= characters to mangle when pasted into a .env file.
--
-- Seeded with the current ngrok tunnel so this works end-to-end today.
-- Repoint at production on deploy — see the trailing comment block.
INSERT INTO private.notify_config (api_base_url, cron_secret)
VALUES (
	'https://pansophical-unmeaningfully-daysi.ngrok-free.dev',
	encode(extensions.gen_random_bytes(32), 'hex')
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- Extensions
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

GRANT USAGE ON SCHEMA cron TO postgres;

-- =========================================================
-- private.notify_upcoming_events() — the dispatcher
--
-- SECURITY DEFINER + SET search_path = '' so every reference is fully
-- qualified (mirrors public.generate_nfc_id in 0004_event_checkin.sql).
-- Execute is revoked from everyone except the function's owner, which is
-- who cron.schedule() runs as.
-- =========================================================

CREATE OR REPLACE FUNCTION private.notify_upcoming_events()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	cfg private.notify_config%ROWTYPE;
	request_id bigint;
BEGIN
	SELECT * INTO cfg FROM private.notify_config;
	IF NOT FOUND THEN
		RAISE EXCEPTION 'private.notify_config is empty — cannot dispatch notifications';
	END IF;

	-- Cheap pre-flight so we don't wake the Next.js route every 5 minutes for
	-- nothing. Mirrors the window app/api/events/notify/route.ts re-derives
	-- for itself — this is only a guard, not the source of truth.
	IF NOT EXISTS (
		SELECT 1 FROM public.schedule_events
		WHERE NOT discord_notified
		  AND starts_at BETWEEN now() AND now() + interval '15 minutes'
	) THEN
		RETURN NULL;
	END IF;

	SELECT net.http_post(
		url := cfg.api_base_url || '/api/events/notify',
		body := '{}'::jsonb,
		headers := jsonb_build_object(
			'Content-Type', 'application/json',
			'Authorization', 'Bearer ' || cfg.cron_secret
		),
		timeout_milliseconds := 30000 -- default is 2000ms; several Discord POSTs can exceed that
	) INTO request_id;

	RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION private.notify_upcoming_events() FROM PUBLIC, anon, authenticated;

-- =========================================================
-- Schedule: every 5 minutes
-- =========================================================

SELECT cron.unschedule('notify-upcoming-events')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-upcoming-events');

SELECT cron.schedule(
	'notify-upcoming-events',
	'*/5 * * * *',
	$$SELECT private.notify_upcoming_events()$$
);

-- =========================================================
-- Operational notes
--
-- On deploy, repoint at production:
--   UPDATE private.notify_config SET api_base_url = 'https://portal.summerhacks.ca';
--
-- Read the generated secret once to copy into CRON_SECRET (must byte-match):
--   SELECT cron_secret FROM private.notify_config;
--
-- Debugging a silent failure — net.http_post is async, responses land here
-- (retained ~6h):
--   SELECT status_code, content, created FROM net._http_response ORDER BY created DESC LIMIT 5;
--   SELECT status, return_message, start_time FROM cron.job_run_details
--     WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'notify-upcoming-events')
--     ORDER BY start_time DESC LIMIT 5;
-- =========================================================
