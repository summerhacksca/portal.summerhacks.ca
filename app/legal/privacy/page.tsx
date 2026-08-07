import { LegalDocument } from "@/components/legal/LegalDocument";
import { PRIVACY_INTRO, PRIVACY_LAST_UPDATED, PRIVACY_SECTIONS } from "@/lib/legal/privacy";

export const metadata = {
	title: "Privacy Policy · SummerHacks",
	description: "What the SummerHacks hacker portal collects and how it's used",
};

export default function PrivacyPage() {
	return (
		<LegalDocument intro={PRIVACY_INTRO} sections={PRIVACY_SECTIONS} lastUpdated={PRIVACY_LAST_UPDATED} />
	);
}
