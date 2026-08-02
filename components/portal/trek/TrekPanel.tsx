"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

/**
 * A pill in the page header that slides a panel in from one edge. Same
 * mechanics as CheckinDrawer - kept mounted, Escape to close, body scroll
 * locked while open - just on the horizontal axis.
 *
 * `children` comes from the server page, so the panel's contents stay server
 * components and arrive in the RSC payload: opening one costs no fetch.
 */
export function TrekPanel({
	side,
	label,
	title,
	icon,
	children,
}: {
	side: "left" | "right";
	label: string;
	title: string;
	icon?: ReactNode;
	children: ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const titleId = useId();

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

	const edgeClass =
		side === "right"
			? `right-0 rounded-l-sm ${open ? "translate-x-0" : "translate-x-full"}`
			: `left-0 rounded-r-sm ${open ? "translate-x-0" : "-translate-x-full"}`;

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				aria-haspopup="dialog"
				aria-expanded={open}
				className="inline-flex h-10 flex-shrink-0 items-center gap-2 rounded-pill bg-surface-pill px-4 font-display text-[13px] font-medium tracking-tight text-text-brand-accent transition-opacity hover:opacity-80"
			>
				{icon}
				{label}
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
					aria-labelledby={titleId}
					className={`absolute inset-y-0 flex w-[min(420px,88vw)] flex-col gap-5 overflow-y-auto bg-surface-card px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-6 shadow-pop transition-transform duration-300 ease-out ${edgeClass}`}
				>
					<h2
						id={titleId}
						className="font-display text-xl font-medium tracking-tighter text-base-800"
					>
						{title}
					</h2>

					{children}

					<button
						type="button"
						tabIndex={open ? 0 : -1}
						onClick={() => setOpen(false)}
						className="mt-auto h-11 flex-shrink-0 self-center rounded-pill bg-surface-pill px-6 font-display text-[13px] font-medium tracking-tight text-text-brand-accent transition-opacity hover:opacity-80"
					>
						Done
					</button>
				</div>
			</div>
		</>
	);
}
