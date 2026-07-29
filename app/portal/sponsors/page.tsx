import { Pill } from "@/components/portal/ui/Pill";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { getSponsors } from "@/lib/portal/queries";

export default async function SponsorsPage() {
	const sponsors = await getSponsors();

	return (
		<main className="mx-auto flex w-full max-w-[1160px] flex-col gap-7 px-9 py-8 pb-20">
			<SectionHeader title="Sponsor challenges" />

			{sponsors.length === 0 ? (
				<p className="font-body text-[14px] text-sun-400">
					Sponsor challenges coming soon.
				</p>
			) : (
				<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{sponsors.map((sponsor) => (
						<div
							key={sponsor.id}
							className="flex flex-col gap-3 rounded-sm bg-surface-card p-6 shadow-card"
						>
							<div className="flex items-center justify-between gap-2">
								<span className="font-display text-base font-semibold tracking-tighter text-base-800">
									{sponsor.name}
								</span>
								<Pill>{sponsor.track}</Pill>
							</div>
							<p className="flex-1 font-body text-[13px] leading-relaxed text-base-800">
								{sponsor.challenge}
							</p>
							<div className="flex items-center gap-2 border-t border-black/[0.06] pt-2">
								<span className="font-display text-xs font-medium text-sun-400">
									Prize
								</span>
								<span className="font-display text-[13px] font-semibold tracking-tight text-base-800">
									{sponsor.prize}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</main>
	);
}
