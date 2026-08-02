/**
 * Constants for the resume upload flow, shared by the client form and the
 * server actions - same role TREK_BUCKET plays in ./trek.ts.
 */

/** Private Supabase Storage bucket. One folder per hacker, named by user_id. */
export const RESUME_BUCKET = "resumes";

/** Matches file_size_limit on the resumes bucket (migrations/0014). */
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export const RESUME_CONTENT_TYPE = "application/pdf";
