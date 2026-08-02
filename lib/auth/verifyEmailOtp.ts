import "server-only";
import type { EmailOtpType, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type OtpResult =
  | { ok: true; session: Session }
  | { ok: false; error: string; status: number };

const INVALID =
  "That code is incorrect or has expired. Request a new one and try again.";

/**
 * `signInWithOtp` creates the account when an accepted applicant signs in for
 * the first time (scripts/promote-hackers.mjs only ever updates roles on
 * accounts that already exist). GoTrue sends those users the Confirm Signup
 * template, whose token verifies as "signup" rather than "email", so both types
 * have to be accepted.
 */
const CODE_TYPES: EmailOtpType[] = ["email", "signup"];

/** Verify the 6-digit code from the sign-in email. */
export async function verifyEmailCode(email: string, code: string): Promise<OtpResult> {
  const supabase = await createClient();

  for (const type of CODE_TYPES) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type,
    });

    if (!error && data.session) {
      return { ok: true, session: data.session };
    }
  }

  return { ok: false, error: INVALID, status: 401 };
}

/** Verify the `token_hash` carried by the link in the sign-in email. */
export async function verifyEmailTokenHash(
  tokenHash: string,
  type: EmailOtpType,
): Promise<OtpResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error || !data.session) {
    return {
      ok: false,
      error: "This sign-in link is no longer valid. Request a new one to continue.",
      status: 401,
    };
  }

  return { ok: true, session: data.session };
}
