import type { Metadata } from "next";
import { TermsAcceptance } from "@/components/legal/TermsAcceptance";
import { DemographicBanner } from "@/components/portal/DemographicBanner";
import { PortalFooter } from "@/components/portal/PortalFooter";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { getProfile, hasAcceptedCurrentTerms } from "@/lib/portal/queries";

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
	const [profile, acceptedTerms] = await Promise.all([getProfile(), hasAcceptedCurrentTerms()]);
	const signedIn = Boolean(profile);
	// A signed-in user who hasn't accepted the current Terms/Privacy version
	// gets the acceptance screen in place of the page - not a dismissible
	// overlay on top of it. children is never rendered into the response, so
	// there's nothing in the DOM to delete past.
	const gated = signedIn && !acceptedTerms;

	return (
		<div className="flex min-h-screen flex-col bg-surface-page">
			<PortalHeader fullName={profile?.full_name ?? ""} signedIn={signedIn} />
			{gated ? (
				<TermsAcceptance />
			) : (
				<>
					{signedIn && <DemographicBanner />}
					{children}
				</>
			)}
			<PortalFooter />
		</div>
	);
}
