"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { reviewTrekSubmission } from "@/app/admin/actions";
import type { CheckinResult } from "@/app/admin/actions";
import { navPillClass, NavPillGroup } from "@/components/portal/ui/NavPill";
import { formatTrekTime } from "@/lib/portal/trek";
import type { SubmissionStatus } from "@/lib/portal/types";

export type TrekReviewRow = {
	id: string;
	teamName: string;
	locationName: string;
	submittedByName: string;
	photoUrl: string | null;
	status: SubmissionStatus;
	reviewNote: string;
	createdAt: string;
};

const FILTERS = [
	{ value: "pending", label: "Needs review" },
	{ value: "approved", label: "Approved" },
	{ value: "rejected", label: "Rejected" },
	{ value: "all", label: "All" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

const STATUS_STYLE: Record<SubmissionStatus, { background: string; color: string }> = {
	pending: { background: "var(--sun-100)", color: "var(--sun-400)" },
	approved: { background: "rgba(143,194,0,0.14)", color: "var(--base-800)" },
	rejected: { background: "rgba(189,60,60,0.1)", color: "var(--terracotta)" },
};

/**
 * Photo review. Every photo scores the moment it lands, so this is a
 * correction tool rather than a gate - rejecting one removes its points and
 * hands the 2pt discovery bonus to that team's next surviving photo at the
 * same spot.
 *
 * Decisions are held in an overrides overlay rather than a copy of the list,
 * so a revalidation from elsewhere doesn't get clobbered (same shape as
 * CheckinPanel).
 */
export function TrekReviewList({ rows }: { rows: TrekReviewRow[] }) {
	const [isPending, startTransition] = useTransition();
	const [filter, setFilter] = useState<Filter>("pending");
	const [overrides, setOverrides] = useState<Record<string, SubmissionStatus>>({});
	const [notes, setNotes] = useState<Record<string, string>>({});
	const [result, setResult] = useState<CheckinResult | null>(null);

	useEffect(() => {
		if (!result) return;
		const timer = setTimeout(() => setResult(null), 5000);
		return () => clearTimeout(timer);
	}, [result]);

	const visible = useMemo(() => {
		return rows.filter((row) => {
			const status = overrides[row.id] ?? row.status;
			return filter === "all" || status === filter;
		});
	}, [rows, overrides, filter]);

	function review(row: TrekReviewRow, status: "approved" | "rejected") {
		startTransition(async () => {
			const actionResult = await reviewTrekSubmission(
				row.id,
				status,
				notes[row.id] ?? row.reviewNote,
			);

			setResult(actionResult);

			if (actionResult.success) {
				setOverrides((previous) => ({ ...previous, [row.id]: status }));
			}
		});
	}

	if (rows.length === 0) {
		return (
			<p className="font-body text-[14px] text-sun-400">
				No photos submitted yet.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-5">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<NavPillGroup>
					{FILTERS.map((option) => (
						<button
							key={option.value}
							type="button"
							onClick={() => setFilter(option.value)}
							className={navPillClass(filter === option.value)}
						>
							{option.label}
						</button>
					))}
				</NavPillGroup>

				{result && (
					<span
						className="rounded-pill px-4 py-2 font-body text-[13px]"
						style={{
							background: result.success
								? "rgba(143,194,0,0.12)"
								: "rgba(189,60,60,0.1)",
							color: result.success ? "var(--base-800)" : "var(--terracotta)",
						}}
					>
						{result.message}
					</span>
				)}
			</div>

			{visible.length === 0 ? (
				<p className="font-body text-[14px] text-sun-400">
					{filter === "pending"
						? "All caught up - every photo has been reviewed."
						: "Nothing here."}
				</p>
			) : (
				<div className="grid gap-5 md:grid-cols-2">
					{visible.map((row) => {
						const status = overrides[row.id] ?? row.status;

						return (
							<div
								key={row.id}
								className="flex flex-col gap-4 rounded-sm bg-surface-card p-5 shadow-card"
							>
								<div className="overflow-hidden rounded-sm bg-sun-100">
									{row.photoUrl ? (
										<a
											href={row.photoUrl}
											target="_blank"
											rel="noopener noreferrer"
										>
											{/* eslint-disable-next-line @next/next/no-img-element -- signed URL, next/image can't optimize it */}
											<img
												src={row.photoUrl}
												alt={`${row.teamName} at ${row.locationName}`}
												className="max-h-72 w-full object-cover"
											/>
										</a>
									) : (
										<p className="p-5 font-body text-[13px] text-sun-400">
											Photo unavailable.
										</p>
									)}
								</div>

								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="flex flex-col gap-0.5">
										<span className="font-display text-[15px] font-medium tracking-tight text-base-800">
											{row.teamName}
										</span>
										<span className="font-body text-[13px] text-sun-400">
											{row.locationName}
										</span>
										<span className="font-mono text-[11px] text-sun-400">
											{formatTrekTime(row.createdAt)} · {row.submittedByName}
										</span>
									</div>

									<span
										className="inline-flex items-center whitespace-nowrap rounded-pill px-2.5 py-1 font-display text-[11px] font-medium tracking-tight"
										style={STATUS_STYLE[status]}
									>
										{status}
									</span>
								</div>

								<input
									type="text"
									value={notes[row.id] ?? row.reviewNote}
									onChange={(event) =>
										setNotes((previous) => ({
											...previous,
											[row.id]: event.target.value,
										}))
									}
									maxLength={140}
									placeholder="Note (the team sees this on a rejection)"
									className="h-11 w-full rounded-sm border border-black/10 bg-sun-50 px-4 text-[14px] text-base-800 outline-none transition focus:border-sun-300 focus:bg-white"
								/>

								<div className="flex flex-wrap gap-2.5">
									<button
										type="button"
										onClick={() => review(row, "approved")}
										disabled={isPending}
										className="inline-flex h-10 items-center justify-center rounded-pill bg-base-900 px-5 font-display text-[13px] font-medium tracking-tight text-base-0 transition-opacity hover:opacity-80 disabled:opacity-50"
									>
										Approve
									</button>
									<button
										type="button"
										onClick={() => review(row, "rejected")}
										disabled={isPending}
										className="inline-flex h-10 items-center justify-center rounded-pill bg-surface-pill px-5 font-display text-[13px] font-medium tracking-tight text-terracotta transition-opacity hover:opacity-80 disabled:opacity-50"
									>
										Reject
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
