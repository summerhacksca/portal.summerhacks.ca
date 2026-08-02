"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	formatStampMeta,
	formatTrekTime,
	pointsLabel,
} from "@/lib/portal/trek";
import type { ScoredSubmissionWithPhoto } from "@/lib/portal/types";

/** Fixed tilt cycle. Deterministic so a re-render never reshuffles the pile. */
const TILT = [-2, 1.5, -1, 2, -1.5];

/** Horizontal travel before a touch counts as a swipe rather than a tap. */
const SWIPE_THRESHOLD = 50;

function stampLabel(submission: ScoredSubmissionWithPhoto) {
	return submission.location_name ?? submission.custom_location ?? "Somewhere else";
}

/**
 * The team's photos as a pile of postage stamps you sift through sideways.
 *
 * Rejected photos stay in the collection, franked VOID at 0 points - a team
 * should be able to see what an organizer took off the board, and why.
 *
 * The perforated edge is the .trek-stamp mask in app/globals.css. A masked box
 * clips box-shadow (and any outline), which is why the shadow and the focus
 * ring both live on the unmasked wrapper rather than on the stamp itself.
 */
export function StampCollection({
	submissions,
}: {
	submissions: ScoredSubmissionWithPhoto[];
}) {
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const stampRefs = useRef<(HTMLButtonElement | null)[]>([]);

	// Depends on activeIndex so focus can go back to the stamp you opened; that
	// is also the only thing the viewer's key-handler effect keys on, so this
	// doesn't cost an extra listener re-bind.
	const handleClose = useCallback(() => {
		setActiveIndex(null);
		if (activeIndex !== null) stampRefs.current[activeIndex]?.focus();
	}, [activeIndex]);

	if (submissions.length === 0) {
		return (
			<div className="flex flex-wrap items-center gap-6 py-2">
				<div className="trek-stamp flex h-[248px] w-[188px] flex-shrink-0 items-center justify-center bg-sun-100/60 p-2.5 sm:w-[220px]">
					<span className="font-mono text-[11px] uppercase tracking-[0.12em] text-sun-400">
						empty
					</span>
				</div>
				<p className="max-w-[280px] font-body text-[14px] leading-relaxed text-sun-400">
					No stamps yet. Your first log at any spot on the list is worth 2
					points.
				</p>
			</div>
		);
	}

	return (
		<>
			{submissions.length > 1 && (
				<span className="font-mono text-[11px] text-sun-400">
					← sift through your collection →
				</span>
			)}

			{/* The negative margins let the pile run off the page edge instead of
			    sitting in a box; py-7 gives the tilt and the hover lift room that
			    overflow-x-auto would otherwise clip. */}
			<div className="-mx-6 flex snap-x snap-mandatory overflow-x-auto px-6 py-7 [scrollbar-width:none] sm:-mx-9 sm:px-9 [&::-webkit-scrollbar]:hidden">
				{submissions.map((submission, index) => {
					const rejected = submission.status === "rejected";
					const name = stampLabel(submission);
					const meta = formatStampMeta(submission.created_at);

					return (
						/* Tilt and stacking order go through custom properties rather
						   than inline style values: an inline `rotate` or `z-index`
						   would outrank the hover utilities that straighten and raise
						   the stamp. */
						<div
							key={submission.id}
							style={
								{
									"--tilt": `${TILT[index % TILT.length]}deg`,
									// Newest is leftmost, so descending order puts the most
									// recent stamp on top of the pile.
									"--stack": String(submissions.length - index),
								} as React.CSSProperties
							}
							className={`flex-shrink-0 snap-center transition-[rotate,translate,filter] duration-200 [filter:drop-shadow(0_8px_24px_rgba(0,0,0,0.14))] [rotate:var(--tilt)] [z-index:var(--stack)] hover:z-30 hover:-translate-y-2 hover:[filter:drop-shadow(0_16px_36px_rgba(0,0,0,0.22))] hover:[rotate:0deg] focus-within:z-30 focus-within:-translate-y-2 focus-within:rounded-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sun-300 focus-within:[filter:drop-shadow(0_16px_36px_rgba(0,0,0,0.22))] focus-within:[rotate:0deg] ${
								index === 0 ? "" : "-ml-5 sm:-ml-7"
							}`}
						>
							<button
								type="button"
								ref={(element) => {
									stampRefs.current[index] = element;
								}}
								onClick={() => setActiveIndex(index)}
								aria-label={`View photo at ${name}, ${meta.date} ${meta.time}`}
								className="trek-stamp block w-[188px] cursor-pointer bg-surface-card p-2.5 text-left focus-visible:outline-none sm:w-[220px]"
							>
								<div className="relative">
									<div className="aspect-[4/5] w-full overflow-hidden rounded-[2px] bg-sun-100">
										{submission.photo_url && (
											/* eslint-disable-next-line @next/next/no-img-element -- signed URL, next/image can't optimize it */
											<img
												src={submission.photo_url}
												alt={`Your team at ${name}`}
												className={`h-full w-full object-cover ${
													rejected ? "opacity-55 grayscale" : ""
												}`}
											/>
										)}
									</div>

									{/* The postmark - franked over the corner of the photo. */}
									<span
										className="absolute -right-1 -top-1 flex h-11 w-11 rotate-[-8deg] items-center justify-center rounded-full border-2 border-dashed bg-surface-card/85 font-display text-[12px] font-semibold tracking-tight"
										style={{
											borderColor: rejected
												? "var(--terracotta)"
												: "var(--sun-400)",
											color: rejected ? "var(--terracotta)" : "var(--sun-400)",
										}}
									>
										{rejected ? "VOID" : pointsLabel(submission.points)}
									</span>
								</div>

								<div className="flex flex-col gap-0.5 px-1 pb-1 pt-3">
									<span className="truncate font-display text-[13px] font-medium tracking-tight text-base-800">
										{name}
									</span>
									<span className="font-mono text-[10px] uppercase tracking-[0.08em] text-sun-400">
										{meta.date} · {meta.time}
										{submission.visit_number === 1 && " · new spot"}
									</span>
									{rejected && submission.review_note && (
										<span className="font-body text-[11px] leading-snug text-terracotta">
											{submission.review_note}
										</span>
									)}
								</div>
							</button>
						</div>
					);
				})}
			</div>

			<StampViewer
				submissions={submissions}
				activeIndex={activeIndex}
				onChange={setActiveIndex}
				onClose={handleClose}
			/>
		</>
	);
}

/**
 * One stamp, pulled out of the collection and held up to the light. Arrow keys
 * and swipes step through the pile without closing it.
 */
function StampViewer({
	submissions,
	activeIndex,
	onChange,
	onClose,
}: {
	submissions: ScoredSubmissionWithPhoto[];
	activeIndex: number | null;
	onChange: (index: number) => void;
	onClose: () => void;
}) {
	const open = activeIndex !== null;
	const touchStartX = useRef<number | null>(null);

	const step = useCallback(
		(delta: number) => {
			if (activeIndex === null) return;
			// Clamped rather than wrapping: running off the end of a collection
			// should feel like the end of it.
			const next = Math.min(
				submissions.length - 1,
				Math.max(0, activeIndex + delta),
			);
			onChange(next);
		},
		[activeIndex, submissions.length, onChange],
	);

	useEffect(() => {
		if (activeIndex === null) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
			if (event.key === "ArrowLeft") step(-1);
			if (event.key === "ArrowRight") step(1);
		};

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKeyDown);

		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [activeIndex, step, onClose]);

	function handleTouchEnd(event: React.TouchEvent) {
		if (touchStartX.current === null) return;

		const travelled = event.changedTouches[0].clientX - touchStartX.current;
		touchStartX.current = null;

		if (travelled > SWIPE_THRESHOLD) step(-1);
		if (travelled < -SWIPE_THRESHOLD) step(1);
	}

	const submission = activeIndex === null ? null : submissions[activeIndex];
	const name = submission ? stampLabel(submission) : "";
	const rejected = submission?.status === "rejected";

	return (
		/* Kept mounted so the backdrop can fade rather than pop. */
		<div
			className={`fixed inset-0 z-50 transition-opacity duration-200 ${
				open ? "opacity-100" : "pointer-events-none opacity-0"
			}`}
		>
			<button
				type="button"
				tabIndex={open ? 0 : -1}
				aria-label="Close"
				onClick={onClose}
				className="absolute inset-0 h-full w-full cursor-default bg-black/85"
			/>

			{/* pointer-events-none so a click anywhere in the gaps still reaches the
			    backdrop button behind it; each real control opts back in. */}
			<div
				role="dialog"
				aria-modal="true"
				aria-label={name ? `Photo at ${name}` : "Photo"}
				className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 py-8"
			>
				<button
					type="button"
					tabIndex={open ? 0 : -1}
					onClick={onClose}
					aria-label="Close"
					className="pointer-events-auto absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-opacity hover:opacity-70"
				>
					<X size={18} />
				</button>

				<div
					onTouchStart={(event) => {
						touchStartX.current = event.touches[0].clientX;
					}}
					onTouchEnd={handleTouchEnd}
					className="pointer-events-auto flex max-h-[68vh] items-center justify-center"
				>
					{submission?.photo_url ? (
						/* eslint-disable-next-line @next/next/no-img-element -- signed URL, next/image can't optimize it */
						<img
							src={submission.photo_url}
							alt={`Your team at ${name}`}
							className={`max-h-[68vh] w-auto max-w-full rounded-sm object-contain ${
								rejected ? "opacity-60 grayscale" : ""
							}`}
						/>
					) : (
						<p className="font-body text-[14px] text-white/70">
							Photo unavailable.
						</p>
					)}
				</div>

				<div className="pointer-events-auto flex w-full max-w-[520px] items-center justify-between gap-4">
					<button
						type="button"
						tabIndex={open ? 0 : -1}
						onClick={() => step(-1)}
						disabled={activeIndex === 0}
						aria-label="Previous photo"
						className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-opacity hover:opacity-70 disabled:opacity-20"
					>
						<ChevronLeft size={18} />
					</button>

					<div className="flex min-w-0 flex-col items-center gap-1 text-center">
						<span className="truncate font-display text-[15px] font-medium tracking-tight text-white">
							{name}
						</span>
						<span className="font-mono text-[11px] text-white/60">
							{submission && formatTrekTime(submission.created_at)}
							{" · "}
							{rejected
								? "not counted"
								: submission && pointsLabel(submission.points)}
						</span>
						<span className="font-mono text-[11px] text-white/40">
							{(activeIndex ?? 0) + 1} of {submissions.length}
						</span>
					</div>

					<button
						type="button"
						tabIndex={open ? 0 : -1}
						onClick={() => step(1)}
						disabled={activeIndex === submissions.length - 1}
						aria-label="Next photo"
						className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-opacity hover:opacity-70 disabled:opacity-20"
					>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>
		</div>
	);
}
