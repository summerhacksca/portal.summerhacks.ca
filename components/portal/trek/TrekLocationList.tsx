import type { ScavengerLocation } from "@/lib/portal/types";

/**
 * The suggested spots, laid out to read in a ~420px panel: everything stacks
 * rather than sitting on one line. `showMarkers` is off until the hacker is on
 * a team, since "logged / new" is a per-team fact.
 */
export function TrekLocationList({
	locations,
	loggedLocationIds,
	showMarkers,
}: {
	locations: ScavengerLocation[];
	loggedLocationIds: string[];
	showMarkers: boolean;
}) {
	if (locations.length === 0) {
		return <p className="font-body text-[14px] text-sun-400">Spots coming soon.</p>;
	}

	const alreadyLogged = new Set(loggedLocationIds);

	return (
		<div className="flex flex-col gap-4">
			<p className="font-body text-[13px] leading-relaxed text-sun-400">
				Suggestions, not a to-do list. Anywhere on here your team hasn&apos;t
				logged yet is worth 2 points.
			</p>

			<div className="flex flex-col gap-px overflow-hidden rounded-sm bg-black/[0.08]">
				{locations.map((location) => {
					const logged = alreadyLogged.has(location.id);

					return (
						<div
							key={location.id}
							className="flex flex-col gap-2 bg-surface-card px-4 py-3.5"
						>
							<span className="font-display text-[15px] font-medium tracking-tight text-base-800">
								{location.name}
							</span>

							<span className="font-body text-[13px] leading-snug text-sun-400">
								{location.area}
								{location.notes && ` · ${location.notes}`}
							</span>

							<div className="flex flex-wrap items-center gap-2">
								<span className="inline-flex items-center whitespace-nowrap rounded-pill bg-sun-100 px-2.5 py-1 font-display text-[11px] font-medium tracking-tight text-sun-400">
									{location.tier}
								</span>
								{showMarkers && (
									<span
										className="inline-flex items-center whitespace-nowrap rounded-pill px-2.5 py-1 font-display text-[11px] font-medium tracking-tight"
										style={{
											background: logged
												? "rgba(143,194,0,0.14)"
												: "var(--sun-100)",
											color: logged ? "var(--base-800)" : "var(--sun-400)",
										}}
									>
										{logged ? "Logged · 1 pt" : "New · 2 pts"}
									</span>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
