"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RESUME_BUCKET } from "@/lib/portal/resume";
import { UNIVERSITY_YEARS } from "@/lib/portal/types";
import { SH_SESSION_COOKIE } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Best-effort delete of an object in the private resumes bucket. Hackers have
 * no DELETE policy on it by design (a resume can't be swapped from the
 * client), so orphan/replaced files are cleaned up here through the
 * service-role client - same pattern as the trek photo cleanup in
 * app/portal/trek/actions.ts.
 */
async function removeResumeObject(path: string) {
  const { error } = await createAdminClient().storage.from(RESUME_BUCKET).remove([path]);
  if (error) {
    console.error("Failed to remove old resume object:", error);
  }
}

/**
 * Step one of uploading a resume: hand the browser a ticket to upload
 * straight into its own folder, so the PDF never round-trips through a
 * function. Minted with the user-scoped client, so the "Hackers write own
 * resume folder" storage policy runs here, at mint time - a hacker cannot
 * obtain a ticket pointing anywhere but their own folder.
 */
export async function startResumeUpload(): Promise<{ path: string; token: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const path = `${user.id}/resume-${Date.now()}.pdf`;

  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error("Failed to mint resume upload URL:", error);
    throw new Error("Could not start the upload. Try again.");
  }

  return { path: data.path, token: data.token };
}

/** Update the signed-in hacker's editable profile fields. RLS scopes the write to their own row. */
export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const teamName = String(formData.get("team_name") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const tracks = formData.getAll("tracks").map((t) => String(t));
  const universityYear = String(formData.get("university_year") ?? "").trim();
  const program = String(formData.get("program") ?? "").trim();
  const resumeUrl = String(formData.get("resume_url") ?? "").trim();
  const resumePath = String(formData.get("resume_path") ?? "").trim();

  if (universityYear && !(UNIVERSITY_YEARS as readonly string[]).includes(universityYear)) {
    throw new Error("Pick a valid year from the list.");
  }

  if (resumeUrl) {
    try {
      const parsed = new URL(resumeUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("bad protocol");
      }
    } catch {
      throw new Error("Enter a valid link to your resume.");
    }
  }

  // resume_path is client-supplied (it names an object the browser just
  // uploaded), so it isn't trusted as-is - it must live inside this hacker's
  // own folder, which is also all the storage policy would ever let them
  // write to.
  if (resumePath && !resumePath.startsWith(`${user.id}/`)) {
    throw new Error("Failed to update profile");
  }

  // A resume upload can't be undone by re-submitting the form (there's no
  // DELETE policy for hackers), so the previous object is fetched now and
  // swept up after a successful write that replaces or clears it.
  const { data: existing } = await supabase
    .from("profiles")
    .select("resume_path")
    .eq("user_id", user.id)
    .maybeSingle();
  const previousResumePath = existing?.resume_path ?? "";

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      team_name: teamName,
      school,
      tracks,
      university_year: universityYear,
      program,
      resume_url: resumeUrl,
      resume_path: resumePath,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update profile:", error);

    // The new object (if any) never got referenced by a row - don't leave it
    // behind.
    if (resumePath && resumePath !== previousResumePath) {
      await removeResumeObject(resumePath);
    }

    throw new Error("Failed to update profile");
  }

  if (previousResumePath && previousResumePath !== resumePath) {
    await removeResumeObject(previousResumePath);
  }

  revalidatePath("/portal", "layout");
}

/** Clear the session and return to the portal login page. */
export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Failed to sign out:", error);
    throw new Error("Failed to sign out");
  }

  const cookieStore = await cookies();
  cookieStore.delete(SH_SESSION_COOKIE);

  redirect("/portal/login");
}
