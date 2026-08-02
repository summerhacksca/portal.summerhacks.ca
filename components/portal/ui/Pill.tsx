import type { ReactNode } from "react";

/** Rounded badge/chip - track labels, prize tags, type tags. */
export function Pill({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<span
			className={`inline-flex items-center whitespace-nowrap rounded-pill bg-sun-100 px-2.5 py-1 font-display text-[11px] font-medium tracking-tight text-sun-400 ${className}`}
		>
			{children}
		</span>
	);
}
