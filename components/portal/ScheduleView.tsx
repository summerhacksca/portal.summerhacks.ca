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
				<div className="overflow-hidden rounded-sm bg-surface-card shadow-card">
					<div className="grid grid-cols-[110px_1fr_140px_200px] bg-sun-50 px-6 py-3.5">
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
							className="grid grid-cols-[110px_1fr_140px_200px] items-center border-t border-black/[0.06] px-6 py-4"
						>
							<span className="font-mono text-[12px] text-base-800">
								{formatTime(row.starts_at)}
							</span>
							<span className="font-display text-[15px] font-medium tracking-tight text-base-800">
								{row.title}
							</span>
							<span className="inline-flex items-center gap-1.5 font-body text-[12px] text-base-800">
								<span
									className="h-2 w-2 flex-shrink-0 rounded-full"
									style={{ background: EVENT_TYPE_COLOR[row.type] }}
								/>
								{row.type}
							</span>
							<span className="font-body text-[13px] text-sun-400">
								{row.location}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
