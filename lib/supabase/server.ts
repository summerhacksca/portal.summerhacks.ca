import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient() {
	const cookieStore = await cookies();
	const sessionCookie = cookieStore.get("sh_session");

	if (sessionCookie?.value) {
		try {
			const session = JSON.parse(sessionCookie.value);
			if (session.access_token) {
				return createSupabaseClient(
					process.env.NEXT_PUBLIC_SUPABASE_URL!,
					process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
					{
						global: {
							headers: {
								Authorization: `Bearer ${session.access_token}`,
							},
						},
					},
				);
			}
		} catch {
			// invalid cookie, fall through
		}
	}

	return createSupabaseClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
	);
}
