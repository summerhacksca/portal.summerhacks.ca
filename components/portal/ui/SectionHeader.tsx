import type { ReactNode } from "react";

/** Numbered/labelled section header used throughout the portal ("1  Live announcements"). */
export function SectionHeader({
	number,
	icon,
	title,
	trailing,
}: {
	number?: string;
	icon?: ReactNode;
	title: string;
	trailing?: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-4">
			<div className="flex items-center gap-9">
				{number && (
					<span className="font-display text-base font-medium tracking-tighter text-base-800">
						{number}
					</span>
				)}
				<div className="flex items-center gap-3">
					{icon}
					<span className="font-display text-base font-medium tracking-tighter text-base-800">
						{title}
					</span>
				</div>
			</div>
			{trailing}
		</div>
	);
}
