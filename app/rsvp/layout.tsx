import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "SummerHacker RSVP",
	description: "RSVP for SummerHacks",
};

export default function RSVPLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <>{children}</>;
}
