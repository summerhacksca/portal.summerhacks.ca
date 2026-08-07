"use server";

import { revalidatePath } from "next/cache";
import { PRIVACY_VERSION } from "@/lib/legal/privacy";
import { TERMS_VERSION } from "@/lib/legal/terms";
import { createClient } from "@/lib/supabase/server";

/**
 * Records acceptance of the current Terms of Use and Privacy Policy for the
 * signed-in user. The versions come from the server-side constants, never
 * from the client, so there's no way to report acceptance of a version the
 * user wasn't actually shown.
 *
 * Both documents are recorded together because TermsAcceptance presents them
 * together - there's no path where a user accepts one but not the other.
 * Writes go through record_legal_acceptance() (migrations/0016), which is
 * SECURITY DEFINER and the only thing with INSERT on legal_acceptances, so
 * user_id and accepted_at are database-supplied.
 */
export async function acceptCurrentTerms() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const [termsResult, privacyResult] = await Promise.all([
    supabase.rpc("record_legal_acceptance", { p_document: "terms", p_version: TERMS_VERSION }),
    supabase.rpc("record_legal_acceptance", { p_document: "privacy", p_version: PRIVACY_VERSION }),
  ]);

  if (termsResult.error || privacyResult.error) {
    console.error(
      "Failed to record legal acceptance:",
      termsResult.error ?? privacyResult.error,
    );
    throw new Error("Couldn't record your acceptance. Try again.");
  }

  revalidatePath("/portal", "layout");
  revalidatePath("/admin", "layout");
}
