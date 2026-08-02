"use client";

import { useMemo, useState } from "react";
import { EVENT_TYPE_COLOR } from "@/lib/portal/eventTypes";
import type { ScheduleEvent } from "@/lib/portal/types";
import { NavPillGroup, navPillClass } from "./ui/NavPill";
import { SectionHeader } from "./ui/SectionHeader";

const TIME_ZONE = "America/Toronto";

function formatTime(iso: string) {
	return new Date(iso).toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		timeZone: TIME_ZONE,
	});
}

/** "9:30 AM" for a point event, "9:30 – 11:00 AM" once ends_at is set (migrations/0013). */
function formatTimeRange(startsAt: string, endsAt: string | null) {
	if (!endsAt) return formatTime(startsAt);
	return `${formatTime(startsAt)} – ${formatTime(endsAt)}`;
}

function dayKey(iso: string) {
	// Stable YYYY-MM-DD grouping key in event-local time.
	return new Date(iso).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

function dayLabel(iso: string, index: number) {
	const date = new Date(iso).toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		timeZone: TIME_ZONE,
	});
	return `Day ${index + 1} · ${date}`;
}

export function ScheduleView({ events }: { events: ScheduleEvent[] }) {
	const days = useMemo(() => {
		const grouped = new Map<string, ScheduleEvent[]>();
		for (const event of events) {
			const key = dayKey(event.starts_at);
			if (!grouped.has(key)) grouped.set(key, []);
			grouped.get(key)!.push(event);
		}
		return Array.from(grouped.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, dayEvents], index) => ({
				key,
				label: dayLabel(dayEvents[0].starts_at, index),
				events: dayEvents,
			}));
	}, [events]);

	const [activeDay, setActiveDay] = useState(0);
	const active = days[activeDay];

	return (
		<div className="flex flex-col gap-7">
			<SectionHeader
				title="Schedule"
				trailing={
					days.length > 0 ? (
						<NavPillGroup>
							{days.map((day, index) => (
								<button
									key={day.key}
									type="button"
									onClick={() => setActiveDay(index)}
									className={navPillClass(index === activeDay)}
								>
									{day.label}
								</button>
							))}
						</NavPillGroup>
					) : undefined
				}
			/>

			{!active ? (
				<p className="font-body text-[14px] text-sun-400">
					Schedule coming soon.
				</p>
			) : (
				/* Below `sm` each row is a stacked card - the fixed 490px of track
				   would crush the 1fr Event column to nothing on a phone. DOM order
				   stays Time/Event/Type/Location so the grid auto-places correctly
				   once it engages; `order-*` only reshuffles the mobile flex column
				   to lead with the title. */
				<div className="overflow-hidden rounded-sm bg-surface-card shadow-card">
					<div className="hidden bg-sun-50 px-6 py-3.5 sm:grid sm:grid-cols-[150px_1fr_140px_200px]">
						{["Time", "Event", "Type", "Track / room"].map((label) => (
							<span
								key={label}
								className="font-display text-[12px] font-semibold tracking-tight text-sun-400"
							>
								{label}
							</span>
						))}
					</div>
					{active.events.map((row) => (
						<div
							key={row.id}
							className="flex flex-col gap-1.5 border-t border-black/[0.06] px-5 py-4 sm:grid sm:grid-cols-[150px_1fr_140px_200px] sm:items-center sm:gap-0 sm:px-6"
						>
							<span className="order-2 font-mono text-[12px] text-base-800 sm:order-none">
								{formatTimeRange(row.starts_at, row.ends_at)}
							</span>
							<span className="order-1 font-display text-base font-medium tracking-tight text-base-800 sm:order-none sm:text-[15px]">
								{row.title}
							</span>
							<span className="order-3 inline-flex items-center gap-1.5 font-body text-[12px] text-base-800 sm:order-none">
								<span
									className="h-2 w-2 flex-shrink-0 rounded-full"
									style={{ background: EVENT_TYPE_COLOR[row.type] }}
								/>
								{row.type}
							</span>
							<span className="order-4 font-body text-[13px] text-sun-400 sm:order-none">
								{row.location}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
