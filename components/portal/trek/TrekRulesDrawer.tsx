"use client";

import { useEffect, useState } from "react";
import {
	TREK_GROUND_RULES,
	TREK_INTRO,
	TREK_PRIZE,
	TREK_SCORING,
	TREK_STEPS,
} from "@/lib/portal/trek";

/**
 * "How it works" pill plus a drawer with the full rules of the game. Same
 * bottom-sheet mechanics as CheckinDrawer, but taller, so the panel scrolls
 * inside itself rather than pushing the page.
 */
export function TrekRulesDrawer() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!open) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKeyDown);

		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				aria-haspopup="dialog"
				aria-expanded={open}
				className="inline-flex h-10 flex-shrink-0 items-center gap-2 rounded-pill bg-surface-pill px-4 font-display text-[13px] font-medium tracking-tight text-text-brand-accent transition-opacity hover:opacity-80"
			>
				<span
					aria-hidden
					className="flex h-4 w-4 items-center justify-center rounded-full bg-sun-300 font-display text-[10px] font-semibold text-base-800"
				>
					?
				</span>
				How it works
			</button>

			{/* Kept mounted so the panel can transition rather than pop in. */}
			<div
				className={`fixed inset-0 z-50 transition-opacity duration-200 ${
					open ? "opacity-100" : "pointer-events-none opacity-0"
				}`}
			>
				<button
					type="button"
					tabIndex={open ? 0 : -1}
					aria-label="Close"
					onClick={() => setOpen(false)}
					className="absolute inset-0 h-full w-full cursor-default bg-black/40"
				/>

				<div
					role="dialog"
					aria-modal="true"
					aria-labelledby="trek-rules-title"
					className={`absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col gap-6 overflow-y-auto rounded-t-sm bg-surface-card px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-4 shadow-pop transition-transform duration-300 ease-out sm:px-9 ${
						open ? "translate-y-0" : "translate-y-full"
					}`}
				>
					<span className="h-1 w-10 flex-shrink-0 self-center rounded-pill bg-black/10" />

					<div className="mx-auto flex w-full max-w-[620px] flex-col gap-6">
						<div className="flex flex-col gap-2">
							<h2
								id="trek-rules-title"
								className="font-display text-xl font-medium tracking-tighter text-base-800"
							>
								The Third Space Trek
							</h2>
							<p className="font-body text-[14px] leading-relaxed text-sun-400">
								{TREK_INTRO}
							</p>
						</div>

						<section className="flex flex-col gap-3">
							<h3 className="font-display text-[15px] font-medium tracking-tight text-base-800">
								How it works
							</h3>
							<ol className="flex flex-col gap-2.5">
								{TREK_STEPS.map((step, index) => (
									<li key={step} className="flex gap-3">
										<span className="font-mono text-[12px] text-sun-400">
											{index + 1}
										</span>
										<span className="font-body text-[14px] leading-relaxed text-base-800">
											{step}
										</span>
									</li>
								))}
							</ol>
						</section>

						<section className="flex flex-col gap-3">
							<h3 className="font-display text-[15px] font-medium tracking-tight text-base-800">
								Scoring
							</h3>
							<div className="flex flex-col gap-px overflow-hidden rounded-sm bg-black/[0.08]">
								{TREK_SCORING.map((row) => (
									<div
										key={row.label}
										className="flex flex-wrap items-center justify-between gap-3 bg-surface-card px-4 py-3"
									>
										<div className="flex flex-col gap-0.5">
											<span className="font-display text-[14px] font-medium tracking-tight text-base-800">
												{row.label}
											</span>
											<span className="font-body text-[13px] text-sun-400">
												{row.detail}
											</span>
										</div>
										<span className="inline-flex items-center whitespace-nowrap rounded-pill bg-sun-100 px-2.5 py-1 font-display text-[11px] font-medium tracking-tight text-sun-400">
											{row.points}
										</span>
									</div>
								))}
							</div>
						</section>

						<section className="flex flex-col gap-3">
							<h3 className="font-display text-[15px] font-medium tracking-tight text-base-800">
								Ground rules
							</h3>
							<ul className="flex flex-col gap-2.5">
								{TREK_GROUND_RULES.map((rule) => (
									<li key={rule} className="flex gap-3">
										<span
											aria-hidden
											className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sun-300"
										/>
										<span className="font-body text-[14px] leading-relaxed text-base-800">
											{rule}
										</span>
									</li>
								))}
							</ul>
						</section>

						<section className="flex flex-col gap-1.5 rounded-sm bg-sun-100 p-5">
							<h3 className="font-display text-[15px] font-medium tracking-tight text-base-800">
								Prize
							</h3>
							<p className="font-body text-[14px] leading-relaxed text-base-800">
								{TREK_PRIZE}
							</p>
						</section>

						<button
							type="button"
							tabIndex={open ? 0 : -1}
							onClick={() => setOpen(false)}
							className="h-11 self-center rounded-pill bg-surface-pill px-6 font-display text-[13px] font-medium tracking-tight text-text-brand-accent transition-opacity hover:opacity-80"
						>
							Done
						</button>
					</div>
				</div>
			</div>
		</>
	);
}
