import type { SupabaseClient, User } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;

/**
 * Page through every auth account until `email` (case-insensitive) matches.
 * GoTrue has no lookup-by-email admin endpoint - scripts/promote-hackers.mjs
 * hits the same constraint and keeps its own copy of this loop rather than
 * importing this one, because that script runs under plain Node ESM and
 * can't resolve the "@/" path alias a .ts module here would need.
 */
export async function findAuthUserByEmail(
  adminClient: SupabaseClient,
  email: string,
): Promise<User | null> {
  const target = email.trim().toLowerCase();
  if (!target) return null;

  for (let page = 1; ; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) {
      throw new Error(`Failed to list users (page ${page}): ${error.message}`);
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === target);
    if (match) return match;

    if (data.users.length < PAGE_SIZE) return null;
  }
}
