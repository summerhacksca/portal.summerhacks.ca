"use client";

import { useEffect, useState } from "react";

/**
 * Check-in status + a button that slides a drawer up from the bottom with the
 * hacker's QR code. Check-in itself is volunteer-run: scanning this QR (or
 * tapping the matching NFC tag) opens the staff-only check-in page. Caller
 * supplies the layout/wrapper.
 */
export function CheckinDrawer({
	checkedIn,
	qrDataUrl,
	fullName,
}: {
	checkedIn: boolean;
	qrDataUrl: string;
	fullName: string;
}) {
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
			<div className="inline-flex items-center gap-2 font-display text-[15px] font-medium tracking-tighter text-base-800">
				<span
					className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
					style={{ background: checkedIn ? "var(--green)" : "var(--sun-300)" }}
				/>
				{checkedIn ? "Checked in" : "Not checked in yet"}
			</div>
			<button
				type="button"
				onClick={() => setOpen(true)}
				aria-haspopup="dialog"
				aria-expanded={open}
				className="h-10 flex-shrink-0 self-start rounded-pill bg-surface-pill px-4 font-display text-[13px] font-medium tracking-tight text-text-brand-accent transition-opacity hover:opacity-80"
			>
				Show my QR
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
					aria-labelledby="checkin-drawer-title"
					className={`absolute inset-x-0 bottom-0 flex flex-col items-center gap-5 rounded-t-sm bg-surface-card px-6 pb-10 pt-4 shadow-pop transition-transform duration-300 ease-out ${
						open ? "translate-y-0" : "translate-y-full"
					}`}
				>
					<span className="h-1 w-10 flex-shrink-0 rounded-pill bg-black/10" />

					<div className="flex flex-col items-center gap-1.5 text-center">
						<h2
							id="checkin-drawer-title"
							className="font-display text-xl font-medium tracking-tighter text-base-800"
						>
							Your check-in code
						</h2>
						<p className="max-w-[320px] font-body text-[13px] leading-snug text-sun-400">
							Show this at the registration desk and before meals — a volunteer
							will scan it. Your NFC tag works the same way.
						</p>
					</div>

					<div className="rounded-sm bg-white p-4 shadow-card">
						{/* eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image can't optimize it */}
						<img
							src={qrDataUrl}
							alt="Your check-in QR code"
							width={224}
							height={224}
							className="h-56 w-56"
						/>
					</div>

					{fullName && (
						<span className="font-display text-[15px] font-medium tracking-tight text-base-800">
							{fullName}
						</span>
					)}

					<button
						type="button"
						tabIndex={open ? 0 : -1}
						onClick={() => setOpen(false)}
						className="h-11 rounded-pill bg-surface-pill px-6 font-display text-[13px] font-medium tracking-tight text-text-brand-accent transition-opacity hover:opacity-80"
					>
						Done
					</button>
				</div>
			</div>
		</>
	);
}
