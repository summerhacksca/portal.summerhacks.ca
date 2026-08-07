import { LegalDocument } from "@/components/legal/LegalDocument";
import { TERMS_CLOSING, TERMS_INTRO, TERMS_LAST_UPDATED, TERMS_SECTIONS } from "@/lib/legal/terms";

export const metadata = {
	title: "Terms of Use · SummerHacks",
	description: "The Terms of Use for SummerHacks and this portal",
};

export default function TermsPage() {
	return (
		<LegalDocument
			intro={TERMS_INTRO}
			sections={TERMS_SECTIONS}
			lastUpdated={TERMS_LAST_UPDATED}
			closing={TERMS_CLOSING}
		/>
	);
}
