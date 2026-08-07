import type { SupabaseClient } from "@supabase/supabase-js";
import { canAccessPortal } from "@/lib/auth/roles";

export type MagicLinkEligibility = { ok: true } | { ok: false; error: string; status: number };

/**
 * Whether this email already belongs to a provisioned portal account. Staff
 * added at /admin/staff and walk-in hackers added at /admin/walk-ins never
 * submit an application, so the application_submissions lookup below would
 * turn them away. public.user_roles is this app's source of truth for access -
 * it is what proxy.ts gates on - so a portal role here outranks whatever the
 * applications table does or doesn't say.
 */
async function hasPortalRole(adminClient: SupabaseClient, email: string): Promise<boolean> {
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("user_id")
    .ilike("email", email)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to look up profile for portal role check:", profileError);
    return false;
  }

  if (!profile) return false;

  const { data: roleRow, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", profile.user_id)
    .maybeSingle();

  if (roleError) {
    console.error("Failed to look up user role for portal role check:", roleError);
    return false;
  }

  return canAccessPortal(roleRow?.role ?? "user");
}

/** Whether a magic link may be sent for portal / RSVP sign-in. */
export async function getMagicLinkEligibility(
  adminClient: SupabaseClient,
  email: string,
): Promise<MagicLinkEligibility> {
  if (await hasPortalRole(adminClient, email)) {
    return { ok: true };
  }

  const { data: application, error: lookupError } = await adminClient
    .from("application_submissions")
    .select("id, status")
    .eq("applicant_email", email)
    .maybeSingle();

  if (lookupError) {
    console.error("Failed to look up applicant:", lookupError);
    return { ok: false, error: "Failed to verify applicant", status: 500 };
  }

  if (!application) {
    return { ok: false, error: "No application found for this email.", status: 403 };
  }

  if (application.status !== "accepted") {
    return {
      ok: false,
      error: "Your application has not been accepted yet.",
      status: 403,
    };
  }

  return { ok: true };
}
