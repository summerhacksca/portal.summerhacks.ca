import { formatTrekTime, pointsLabel } from "@/lib/portal/trek";
import type { ScoredSubmissionWithPhoto } from "@/lib/portal/types";

/**
 * Everything this team has logged, newest first. Rejected photos stay in the
 * list at 0 points rather than vanishing - a team should be able to see what
 * an organizer took off the board, and why.
 */
export function SubmissionHistory({
	submissions,
}: {
	submissions: ScoredSubmissionWithPhoto[];
}) {
	if (submissions.length === 0) {
		return (
			<p className="font-body text-[14px] text-sun-400">
				No photos yet. Your first log at any spot on the list is worth 2 points.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-px overflow-hidden rounded-sm bg-black/[0.08]">
			{submissions.map((submission) => {
				const rejected = submission.status === "rejected";
				const name =
					submission.location_name ?? submission.custom_location ?? "Somewhere else";

				return (
					<div
						key={submission.id}
						className="flex flex-wrap items-center gap-4 bg-surface-card px-5 py-4"
					>
						<div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-sm bg-sun-100">
							{submission.photo_url && (
								/* eslint-disable-next-line @next/next/no-img-element -- signed URL, next/image can't optimize it */
								<img
									src={submission.photo_url}
									alt={`Your team at ${name}`}
									className="h-full w-full object-cover"
								/>
							)}
						</div>

						<div className="flex min-w-0 flex-1 flex-col gap-0.5">
							<span className="font-display text-[15px] font-medium tracking-tight text-base-800">
								{name}
							</span>
							<span className="font-mono text-[12px] text-sun-400">
								{formatTrekTime(submission.created_at)}
								{submission.visit_number === 1 && " · new spot"}
							</span>
							{rejected && submission.review_note && (
								<span className="font-body text-[13px] text-terracotta">
									{submission.review_note}
								</span>
							)}
						</div>

						<span
							className="inline-flex items-center whitespace-nowrap rounded-pill px-2.5 py-1 font-display text-[11px] font-medium tracking-tight"
							style={{
								background: rejected ? "rgba(189,60,60,0.1)" : "var(--sun-100)",
								color: rejected ? "var(--terracotta)" : "var(--sun-400)",
							}}
						>
							{rejected ? "Not counted" : pointsLabel(submission.points)}
						</span>
					</div>
				);
			})}
		</div>
	);
}
