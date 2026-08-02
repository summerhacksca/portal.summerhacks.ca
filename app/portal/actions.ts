"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      team_name: teamName,
      school,
      tracks,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update profile:", error);
    throw new Error("Failed to update profile");
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
  cookieStore.delete("sh_session");

  redirect("/portal/login");
}
