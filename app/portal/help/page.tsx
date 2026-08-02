import { FaqAccordion } from "@/components/portal/FaqAccordion";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { FAQ_ITEMS, HELP_CONTACTS } from "@/lib/portal/staticContent";

export default function HelpPage() {
	const faq = FAQ_ITEMS;
	const directory = HELP_CONTACTS;

	return (
		<main className="mx-auto flex w-full max-w-[1160px] flex-col gap-11 px-6 py-8 pb-20 sm:px-9">
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
				{/* Three columns of prose don't fit a phone, so below `sm` each row
				    stacks into a card. Topic leads in DOM order already, so unlike
				    ScheduleView this needs no order-* reshuffling. */}
				<div className="overflow-hidden rounded-sm bg-surface-card shadow-card">
					<div className="hidden bg-sun-50 px-6 py-3.5 sm:grid sm:grid-cols-3">
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
							className="flex flex-col gap-1 border-t border-black/[0.06] px-5 py-4 sm:grid sm:grid-cols-3 sm:items-center sm:gap-0 sm:px-6"
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
