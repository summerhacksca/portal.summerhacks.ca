"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
	trekState,
	type TrekState,
	type TrekStateInput,
} from "@/lib/portal/trek";
import { useNow } from "@/lib/portal/useNow";

const DOT_COLOR: Record<TrekState["kind"], string> = {
	open: "var(--green)",
	cooldown: "var(--sun-300)",
	"before-start": "var(--sun-300)",
	closed: "var(--terracotta)",
};

/**
 * Live status of the hunt - "Opens in 2h 14m", "Next photo in 41:12",
 * "Standings locked". `initialState` is computed once on the server so the
 * first paint matches SSR exactly; useNow() takes over on the client.
 */
export function TrekStatusPill({
	input,
	initialState,
}: {
	input: TrekStateInput;
	initialState: TrekState;
}) {
	const router = useRouter();
	const nowMs = useNow();
	const state = nowMs === 0 ? initialState : trekState(input, nowMs);

	// The moment a countdown runs out, everything the server told us about the
	// hunt is stale. Pull fresh data once so the log form re-enables against
	// real state rather than optimistically.
	useEffect(() => {
		if (initialState.kind !== "open" && state.kind === "open") {
			router.refresh();
		}
	}, [initialState.kind, state.kind, router]);

	return (
		<span className="inline-flex items-center gap-2 whitespace-nowrap rounded-pill bg-surface-pill px-3.5 py-2 font-display text-[13px] font-medium tracking-tight text-base-800">
			<span
				className="h-2 w-2 flex-shrink-0 rounded-full"
				style={{ background: DOT_COLOR[state.kind] }}
			/>
			{state.label}
		</span>
	);
}
