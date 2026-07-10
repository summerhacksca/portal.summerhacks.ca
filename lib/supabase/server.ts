import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type SupabaseCookie = {
	name: string;
	value: string;
	options: Record<string, unknown>;
};

/**
 * Creates a Supabase server client using @supabase/ssr.
 * Used in route handlers and server components where `cookies()` is available.
 *
 * Optionally collects cookies into an external array instead of writing them
 * to the response immediately — useful when returning a custom NextResponse
 * (e.g. redirect) and you need to apply the cookies to that response manually.
 */
export async function createClient(collectInto?: SupabaseCookie[]) {
	const cookieStore = await cookies();

	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet) {
					if (collectInto) {
						cookiesToSet.forEach((c) => collectInto.push(c));
					} else {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options),
						);
					}
				},
			},
		},
	);
}
