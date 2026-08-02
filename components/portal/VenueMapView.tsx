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
					role="dialog"
					aria-modal="true"
					aria-label={`${view.label} floor plan, expanded`}
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
				>
					{/* Backdrop is a button rather than a click handler on the wrapper,
					    matching the other overlays - a div with onClick isn't reachable
					    by keyboard and swallows taps meant for the image. */}
					<button
						type="button"
						aria-label="Close"
						onClick={() => setExpanded(false)}
						className="absolute inset-0 h-full w-full cursor-default"
					/>
					<button
						type="button"
						onClick={() => setExpanded(false)}
						aria-label="Close expanded floor plan"
						className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-pill bg-base-0 font-display text-base-800 shadow-pop sm:right-6 sm:top-6"
					>
						×
					</button>
					{/* eslint-disable-next-line @next/next/no-img-element -- embedded-raster SVG, next/image cannot optimize it */}
					<img
						src={view.src}
						alt={`${view.label} floor plan of the venue, expanded`}
						className="pointer-events-none relative max-h-[90vh] max-w-full object-contain"
					/>
				</div>
			)}
		</div>
	);
}
