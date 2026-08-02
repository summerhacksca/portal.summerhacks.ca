"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { establishSession } from "@/lib/auth/establishSession";
import { verifyEmailTokenHash } from "@/lib/auth/verifyEmailOtp";

const EMAIL_OTP_TYPES = [
  "email",
  "signup",
  "magiclink",
  "invite",
  "recovery",
  "email_change",
] as const;

function parseOtpType(value: FormDataEntryValue | null): EmailOtpType {
  return typeof value === "string" && (EMAIL_OTP_TYPES as readonly string[]).includes(value)
    ? (value as EmailOtpType)
    : "email";
}

/**
 * Completes a sign-in started from the emailed link.
 *
 * This deliberately runs on POST only. The token in the link is single-use, and
 * mail scanners that pre-fetch links - Outlook Safe Links is on by default for
 * Microsoft 365 tenants - would consume it on a GET and leave the real user
 * (and the 6-digit code, which is the same token) with nothing to redeem.
 */
export async function confirmSignIn(formData: FormData) {
  const tokenHash = formData.get("token_hash");

  if (typeof tokenHash !== "string" || !tokenHash) {
    redirect("/portal/login?error=link_invalid");
  }

  const result = await verifyEmailTokenHash(tokenHash, parseOtpType(formData.get("type")));

  if (!result.ok) {
    redirect("/portal/login?error=link_invalid");
  }

  redirect(await establishSession(result.session));
}
