import type { ReactNode } from "react";

/** Shared class string for a single pill in a tab bar / day toggle - apply to a <Link> or <button>. */
export function navPillClass(active: boolean) {
	return `inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-3.5 py-2 font-display text-[13px] font-medium tracking-tighter transition-opacity hover:opacity-80 ${
		active ? "bg-base-900 text-base-0" : "bg-transparent text-base-800"
	}`;
}

/**
 * Rounded-pill container that groups a set of nav pills (tab bar / day toggle).
 *
 * `min-w-0` is what makes the horizontal scroll work: without it this flex
 * child refuses to shrink below its content width, so overflow-x-auto never
 * engages and the strip pushes the rest of the header off-screen instead.
 */
export function NavPillGroup({ children }: { children: ReactNode }) {
	return (
		<nav className="flex min-w-0 gap-0.5 overflow-x-auto rounded-pill bg-sun-100 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
			{children}
		</nav>
	);
}
