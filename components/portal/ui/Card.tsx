import type { ReactNode } from "react";

export function Card({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={`rounded-sm bg-surface-card shadow-card ${className}`}>
			{children}
		</div>
	);
}
