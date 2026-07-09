-- Run this SQL in your Supabase Dashboard → SQL Editor
-- This creates the table needed for RSVP submissions.

-- Create the RSVP submissions table
CREATE TABLE IF NOT EXISTS public.rsvp_submissions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	email text NOT NULL,
	participating text NOT NULL,
	downtown text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rsvp_submissions ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own RSVP
CREATE POLICY "Users can read own RSVP" ON public.rsvp_submissions
	FOR SELECT
	TO authenticated
	USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rsvp_submissions_user_id ON public.rsvp_submissions(user_id);
