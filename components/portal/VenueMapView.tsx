"use client";

import { useEffect, useState } from "react";
import { NavPillGroup, navPillClass } from "./ui/NavPill";
import { SectionHeader } from "./ui/SectionHeader";

const VIEWS = [
	{
		key: "blueprint",
		label: "Blueprint",
		src: "/assets/stackt.svg",
		width: 1987,
		height: 967,
		// Opaque white raster - a plain white card behind it is invisible.
		background: "bg-surface-card",
	},
	{
		key: "3d",
		label: "3D view",
		src: "/assets/horseshoe.svg",
		width: 2301,
		height: 1215,
		// Raster has real alpha around the render - a white card would show
		// through as a stark box, so match the page tone instead.
		background: "bg-surface-page",
	},
] as const;

export function VenueMapView() {
	const [activeView, setActiveView] = useState(0);
	const [expanded, setExpanded] = useState(false);
	const view = VIEWS[activeView];

	useEffect(() => {
		if (!expanded) return;

		document.body.style.overflow = "hidden";
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setExpanded(false);
		};
		window.addEventListener("keydown", onKeyDown);

		return () => {
			document.body.style.overflow = "";
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [expanded]);

	return (
		<div className="flex flex-col gap-7">
			<SectionHeader
				title="Venue map"
				trailing={
					<NavPillGroup>
						{VIEWS.map((v, index) => (
							<button
								key={v.key}
								type="button"
								onClick={() => setActiveView(index)}
								className={navPillClass(index === activeView)}
							>
								{v.label}
							</button>
						))}
					</NavPillGroup>
				}
			/>

			<button
				type="button"
				onClick={() => setExpanded(true)}
				aria-label={`Expand ${view.label.toLowerCase()} floor plan`}
				className={`overflow-hidden rounded-sm shadow-card ${view.background}`}
			>
				{/* eslint-disable-next-line @next/next/no-img-element -- embedded-raster SVG, next/image cannot optimize it */}
				<img
					src={view.src}
					alt={`${view.label} floor plan of the venue`}
					width={view.width}
					height={view.height}
					loading="eager"
					className="h-auto w-full"
				/>
			</button>

			{expanded && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
					onClick={() => setExpanded(false)}
				>
					<button
						type="button"
						onClick={() => setExpanded(false)}
						aria-label="Close expanded floor plan"
						className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-pill bg-base-0 font-display text-base-800 shadow-pop"
					>
						×
					</button>
					{/* eslint-disable-next-line @next/next/no-img-element -- embedded-raster SVG, next/image cannot optimize it */}
					<img
						src={view.src}
						alt={`${view.label} floor plan of the venue, expanded`}
						className="max-h-[90vh] max-w-[95vw] object-contain"
						onClick={(event) => event.stopPropagation()}
					/>
				</div>
			)}
		</div>
	);
}
