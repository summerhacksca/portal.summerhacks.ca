import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const supabase = await createClient();

	// Use getSession() instead of getUser() — reads the session from cookies
	// without an API call, which is more reliable for SSR
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		redirect("/rsvp/login");
	}

	return <>{children}</>;
}
