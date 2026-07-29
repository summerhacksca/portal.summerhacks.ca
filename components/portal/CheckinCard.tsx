"use client";

import { useTransition } from "react";
import { toggleCheckin } from "@/app/portal/actions";

/** Check-in status dot + label + toggle button. Caller supplies layout/wrapper. */
export function CheckinCard({ checkedIn }: { checkedIn: boolean }) {
	const [isPending, startTransition] = useTransition();

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
				disabled={isPending}
				onClick={() => startTransition(() => toggleCheckin())}
				className="h-10 flex-shrink-0 self-start rounded-pill bg-surface-pill px-4 font-display text-[13px] font-medium tracking-tight text-text-brand-accent transition-opacity hover:opacity-80 disabled:opacity-50"
			>
				{isPending ? "Updating…" : checkedIn ? "Undo" : "Check in now"}
			</button>
		</>
	);
}
