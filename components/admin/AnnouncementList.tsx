"use client";

import { useState, useTransition } from "react";
import { deleteAnnouncement } from "@/app/admin/actions";
import { relativeTime } from "@/lib/portal/relativeTime";
import type { Announcement } from "@/lib/portal/types";

/**
 * Recent announcements with a Delete button. Deletions are held in a
 * deletedIds overlay rather than mutating `announcements`, so the row
 * disappears immediately without waiting on a route refresh (same shape as
 * TrekReviewList's overrides overlay).
 */
export function AnnouncementList({ announcements }: { announcements: Announcement[] }) {
	const [isPending, startTransition] = useTransition();
	const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
	const [pendingId, setPendingId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const visible = announcements.filter((note) => !deletedIds.has(note.id));

	function remove(id: string) {
		setPendingId(id);
		setError(null);

		startTransition(async () => {
			const result = await deleteAnnouncement(id);

			if (result.success) {
				setDeletedIds((previous) => new Set(previous).add(id));
			} else {
				setError(result.message);
			}

			setPendingId(null);
		});
	}

	if (visible.length === 0) {
		return <p className="font-body text-[14px] text-sun-400">No announcements yet.</p>;
	}

	return (
		<div className="flex flex-col gap-5">
			{error && (
				<p
					className="rounded-sm px-4 py-3 font-body text-[13px]"
					style={{ background: "rgba(189,60,60,0.1)", color: "var(--terracotta)" }}
				>
					{error}
				</p>
			)}

			<div className="overflow-hidden rounded-sm bg-surface-card shadow-card">
				{visible.map((note) => (
					<div
						key={note.id}
						className="flex flex-wrap items-start gap-4 border-t border-black/6 px-5 py-4 first:border-t-0"
					>
						{/* Meta is a 120px sidebar on desktop and a one-line header on
						    mobile, matching the portal home announcements feed. */}
						<div className="flex w-full flex-row items-center gap-2 sm:w-[120px] sm:shrink-0 sm:flex-col sm:items-start sm:gap-0.5">
							<span className="font-mono text-[11px] text-sun-400">
								{relativeTime(note.created_at)}
							</span>
							<span className="font-display text-[12px] font-semibold text-base-800">
								#{note.channel}
							</span>
						</div>

						<p className="w-full min-w-0 font-body text-[14px] leading-relaxed text-base-800 sm:w-auto sm:min-w-45 sm:flex-1">
							{note.body}
						</p>

						<button
							type="button"
							onClick={() => remove(note.id)}
							disabled={isPending && pendingId === note.id}
							className="inline-flex h-9 shrink-0 items-center rounded-pill bg-surface-pill px-4 font-display text-[13px] font-medium tracking-tight text-terracotta transition-opacity hover:opacity-80 disabled:opacity-50"
						>
							{isPending && pendingId === note.id ? "Deleting…" : "Delete"}
						</button>
					</div>
				))}
			</div>
		</div>
	);
}
