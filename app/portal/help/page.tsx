import { FaqAccordion } from "@/components/portal/FaqAccordion";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { getDirectory, getFaq } from "@/lib/portal/queries";

export default async function HelpPage() {
	const [faq, directory] = await Promise.all([getFaq(), getDirectory()]);

	return (
		<main className="mx-auto flex w-full max-w-[1160px] flex-col gap-11 px-9 py-8 pb-20">
			<section className="flex flex-col gap-5">
				<SectionHeader title="FAQ" />
				{faq.length === 0 ? (
					<p className="font-body text-[14px] text-sun-400">
						No FAQ entries yet.
					</p>
				) : (
					<FaqAccordion items={faq} />
				)}
			</section>

			<section className="flex flex-col gap-5">
				<SectionHeader title="Who do I ask?" />
				<div className="overflow-hidden rounded-sm bg-surface-card shadow-card">
					<div className="grid grid-cols-3 bg-sun-50 px-6 py-3.5">
						{["Topic", "Contact", "Where to find them"].map((label) => (
							<span
								key={label}
								className="font-display text-[12px] font-semibold tracking-tight text-sun-400"
							>
								{label}
							</span>
						))}
					</div>
					{directory.map((row) => (
						<div
							key={row.id}
							className="grid grid-cols-3 items-center border-t border-black/[0.06] px-6 py-4"
						>
							<span className="font-display text-sm font-medium tracking-tight text-base-800">
								{row.topic}
							</span>
							<span className="font-body text-[13px] text-base-800">
								{row.contact}
							</span>
							<span className="font-body text-[13px] text-sun-400">
								{row.location}
							</span>
						</div>
					))}
				</div>
			</section>
		</main>
	);
}
