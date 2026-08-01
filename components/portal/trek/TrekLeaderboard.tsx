import type { ScavengerLeaderboardRow } from "@/lib/portal/types";

/**
 * Every team's standings, visible to every hacker - that's the point of a
 * leaderboard. Teams with zero points still get a row: an empty board before
 * the hunt opens is correct, and reads better than a blank panel.
 */
export function TrekLeaderboard({
	rows,
	myTeamId,
}: {
	rows: ScavengerLeaderboardRow[];
	myTeamId: string | null;
}) {
	if (rows.length === 0) {
		return (
			<p className="font-body text-[14px] text-sun-400">
				No teams yet. Create one and you&apos;ll be first on the board.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-px overflow-hidden rounded-sm bg-black/[0.08]">
			{rows.map((row, index) => {
				const isMine = row.team_id === myTeamId;

				return (
					<div
						key={row.team_id}
						className="flex flex-wrap items-center gap-4 px-5 py-4"
						style={{
							background: isMine ? "var(--sun-100)" : "var(--surface-card)",
						}}
					>
						<span className="w-6 flex-shrink-0 font-mono text-[13px] text-sun-400">
							{index + 1}
						</span>

						<div className="flex min-w-0 flex-1 flex-col gap-0.5">
							<span className="font-display text-[15px] font-medium tracking-tight text-base-800">
								{row.team_name}
								{isMine && (
									<span className="ml-2 font-mono text-[11px] text-sun-400">
										your team
									</span>
								)}
							</span>
							<span className="font-mono text-[12px] text-sun-400">
								{row.spots_found} {row.spots_found === 1 ? "spot" : "spots"} ·{" "}
								{row.photo_count} {row.photo_count === 1 ? "photo" : "photos"}
							</span>
						</div>

						<span className="font-display text-lg font-medium tracking-tighter text-base-800">
							{row.points}
						</span>
					</div>
				);
			})}
		</div>
	);
}
