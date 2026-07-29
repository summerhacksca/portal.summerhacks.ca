import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { getMapZones } from "@/lib/portal/queries";

export default async function MapPage() {
	const zones = await getMapZones();

	return (
		<main className="mx-auto flex w-full max-w-[1160px] flex-col gap-7 px-9 py-8 pb-20">
			<SectionHeader title="Venue map" />
			<p className="font-body text-[14px] text-sun-400">
				Stackt Market, 28 Bathurst St, Toronto — in-person day.
			</p>

			<div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1.3fr_1fr]">
				<div className="flex h-[460px] w-full items-center justify-center rounded-sm border border-dashed border-black/15 bg-sun-100 font-body text-[13px] text-sun-400">
					Venue floor plan coming soon
				</div>

				<div className="flex flex-col gap-px overflow-hidden rounded-sm bg-black/[0.08]">
					{zones.length === 0 ? (
						<p className="bg-surface-card p-5 font-body text-[14px] text-sun-400">
							Map details coming soon.
						</p>
					) : (
						zones.map((zone) => (
							<div
								key={zone.id}
								className="flex items-start gap-3.5 bg-surface-card px-4.5 py-3.5"
							>
								<span
									className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
									style={{ background: zone.color }}
								/>
								<div className="flex flex-col gap-0.5">
									<span className="font-display text-sm font-medium tracking-tight text-base-800">
										{zone.name}
									</span>
									<span className="font-body text-xs text-sun-400">
										{zone.description}
									</span>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</main>
	);
}
