import type { ReactNode } from "react";

/** Shared class string for a single pill in a tab bar / day toggle — apply to a <Link> or <button>. */
export function navPillClass(active: boolean) {
	return `inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-3.5 py-2 font-display text-[13px] font-medium tracking-tighter transition-opacity hover:opacity-80 ${
		active ? "bg-base-900 text-base-0" : "bg-transparent text-base-800"
	}`;
}

/** Rounded-pill container that groups a set of nav pills (tab bar / day toggle). */
export function NavPillGroup({ children }: { children: ReactNode }) {
	return (
		<nav className="flex gap-0.5 rounded-pill bg-sun-100 p-1">{children}</nav>
	);
}
