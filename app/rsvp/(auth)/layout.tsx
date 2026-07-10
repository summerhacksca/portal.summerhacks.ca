import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const cookieStore = await cookies();
	const sessionCookie = cookieStore.get("sh_session");

	if (!sessionCookie?.value) {
		redirect("/rsvp/login");
	}

	// Verify the session is valid by checking the cookie exists
	// (The RSVP API will validate the token server-side)
	return <>{children}</>;
}
