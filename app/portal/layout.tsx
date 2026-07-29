import type { Metadata } from "next";
import { PortalFooter } from "@/components/portal/PortalFooter";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { getOrCreateProfile } from "@/lib/portal/queries";

export const metadata: Metadata = {
	title: "Hacker Portal · SummerHacks",
	description: "Your SummerHacks event dashboard",
};

export const dynamic = "force-dynamic";

export default async function PortalLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const profile = await getOrCreateProfile();

	return (
		<div className="flex min-h-screen flex-col bg-surface-page">
			<PortalHeader fullName={profile?.full_name ?? ""} />
			{children}
			<PortalFooter />
		</div>
	);
}
