import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const cookieStore = await cookies();
	const allCookies = cookieStore.getAll().map((c) => c.name);
	console.log("[auth/layout] all cookie names:", allCookies);

	const sessionCookie = cookieStore.get("sh_session");
	console.log("[auth/layout] sh_session cookie found:", !!sessionCookie?.value);

	if (!sessionCookie?.value) {
		console.log("[auth/layout] no session, redirecting to /rsvp/login");
		redirect("/rsvp/login");
	}

	console.log("[auth/layout] session found, rendering page");
	return <>{children}</>;
}
