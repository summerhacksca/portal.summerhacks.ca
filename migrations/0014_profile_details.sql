-- Run this SQL in your Supabase Dashboard → SQL Editor
-- Run AFTER 0013_schedule_2026_seed.sql.
--
-- Adds three hacker-facing profile fields - university year, program, and a
-- resume (either a pasted link or an uploaded PDF) - plus the private Storage
-- bucket the upload flow needs.

-- =========================================================
-- public.profiles - new columns
--
-- resume_url and resume_path are separate because they're read differently:
-- resume_url is used as-is, resume_path is an object key in the `resumes`
-- bucket that has to be turned into a short-lived signed URL (see
-- getResumeSignedUrl in lib/portal/queries.ts). Same split as photo_path on
-- scavenger_submissions (migrations/0009) - this codebase never stores a
-- public Storage URL.
-- =========================================================

ALTER TABLE public.profiles
	ADD COLUMN IF NOT EXISTS university_year text NOT NULL DEFAULT '',
	ADD COLUMN IF NOT EXISTS program text NOT NULL DEFAULT '',
	ADD COLUMN IF NOT EXISTS resume_url text NOT NULL DEFAULT '',
	ADD COLUMN IF NOT EXISTS resume_path text NOT NULL DEFAULT '';

ALTER TABLE public.profiles
	DROP CONSTRAINT IF EXISTS profiles_university_year_check;

ALTER TABLE public.profiles
	ADD CONSTRAINT profiles_university_year_check
	CHECK (university_year IN (
		'', '1st year', '2nd year', '3rd year', '4th year', '5th year+', 'Graduate student'
	));

-- =========================================================
-- Extend the column-level grant from 0006_profile_provisioning.sql
--
-- That migration revoked table-wide UPDATE on profiles and granted it back
-- column by column, pinned to exactly what updateProfile() in
-- app/portal/actions.ts sends. The four new columns have to be added to that
-- same grant or the app's UPDATE fails at the privilege layer regardless of
-- RLS.
-- =========================================================

GRANT UPDATE (
	full_name, team_name, school, tracks,
	university_year, program, resume_url, resume_path,
	updated_at
) ON public.profiles TO authenticated;

-- =========================================================
-- Storage — private bucket, one folder per hacker
--
-- Structurally the same as the scavenger-hunt bucket in 0009_scavenger_hunt.sql,
-- except the folder key is the hacker's own auth.uid() instead of a team slug.
-- No UPDATE/DELETE policy for hackers - a replaced resume is cleaned up
-- server-side through the service-role client, same pattern as the trek photo
-- cleanup in app/portal/trek/actions.ts.
-- =========================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
	'resumes',
	'resumes',
	false,
	5242880,
	ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
	file_size_limit = EXCLUDED.file_size_limit,
	allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Hackers read own resume folder" ON storage.objects;

CREATE POLICY "Hackers read own resume folder" ON storage.objects
	FOR SELECT TO authenticated
	USING (
		bucket_id = 'resumes'
		AND (storage.foldername(name))[1] = auth.uid()::text
	);

DROP POLICY IF EXISTS "Hackers write own resume folder" ON storage.objects;

CREATE POLICY "Hackers write own resume folder" ON storage.objects
	FOR INSERT TO authenticated
	WITH CHECK (
		bucket_id = 'resumes'
		AND public.can_access_portal()
		AND (storage.foldername(name))[1] = auth.uid()::text
	);

DROP POLICY IF EXISTS "Staff can manage the resumes bucket" ON storage.objects;

CREATE POLICY "Staff can manage the resumes bucket" ON storage.objects
	FOR ALL TO authenticated
	USING (bucket_id = 'resumes' AND public.can_access_admin())
	WITH CHECK (bucket_id = 'resumes' AND public.can_access_admin());
