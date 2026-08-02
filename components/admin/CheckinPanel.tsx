"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import {
	autoCheckInUser,
	checkInUser,
	uncheckInUser,
	type CheckinResult,
} from "@/app/admin/actions";

const TIME_ZONE = "America/Toronto";
/** Same key the reference implementation uses, so a volunteer's pick survives reloads. */
const SELECTED_EVENT_KEY = "admin_selected_event_id";

function subscribeToStorage(onChange: () => void) {
	window.addEventListener("storage", onChange);
	return () => window.removeEventListener("storage", onChange);
}

const readCachedEventId = () => window.localStorage.getItem(SELECTED_EVENT_KEY);
/** localStorage doesn't exist during SSR; null keeps the first paint hydration-safe. */
const readCachedEventIdOnServer = () => null;

type CheckinEvent = {
	id: string;
	title: string;
	startsAt: string;
};

function formatEventTime(iso: string) {
	return new Date(iso).toLocaleString("en-US", {
		weekday: "short",
		hour: "numeric",
		minute: "2-digit",
		timeZone: TIME_ZONE,
	});
}

function Field({ label, value, href }: { label: string; value: string; href?: string }) {
	return (
		<div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-black/[0.06] px-5 py-3 first:border-t-0">
			<span className="font-display text-[12px] font-semibold tracking-tight text-sun-400">
				{label}
			</span>
			{href ? (
				<a
					href={href}
					target="_blank"
					rel="noreferrer"
					className="font-body text-[14px] text-text-brand-accent underline"
				>
					{value}
				</a>
			) : (
				<span className="font-body text-[14px] text-base-800">{value}</span>
			)}
		</div>
	);
}

export function CheckinPanel({
	nfcId,
	checkInUrl,
	profile,
	events,
	defaultEventId,
	autoCheckInEventId,
	noActiveEvent,
	checkedInEventIds,
}: {
	nfcId: string;
	checkInUrl: string;
	profile: {
		fullName: string;
		email: string;
		teamName: string;
		school: string;
		tracks: string[];
		program: string;
		universityYear: string;
		resumeUrl: string;
	};
	events: CheckinEvent[];
	defaultEventId: string;
	/** Set only when exactly one check-in event is active - triggers the auto-fire effect below. */
	autoCheckInEventId: string | null;
	/** Nothing is active right now; `events` has fallen back to the full list. */
	noActiveEvent: boolean;
	checkedInEventIds: string[];
}) {
	const [pickedEventId, setPickedEventId] = useState<string | null>(null);
	// Overlay on top of the server's check-in state rather than a copy of it, so a
	// revalidation can't be clobbered by stale local state.
	const [overrides, setOverrides] = useState<Record<string, boolean>>({});
	const [result, setResult] = useState<CheckinResult | null>(null);
	const [copied, setCopied] = useState(false);
	const [isAutoChecking, setIsAutoChecking] = useState(Boolean(autoCheckInEventId));
	const [isPending, startTransition] = useTransition();
	// Guards the auto check-in effect so React StrictMode's dev double-mount
	// (or a re-render with the same nfcId) can't fire the scan twice.
	const autoFired = useRef(false);

	const cachedEventId = useSyncExternalStore(
		subscribeToStorage,
		readCachedEventId,
		readCachedEventIdOnServer,
	);

	// A confirmed active event overrides everything, including a stale sticky
	// pick from a previous shift - that staleness is exactly the bug this
	// auto-check-in feature exists to route around.
	const selectedEventId =
		autoCheckInEventId ??
		pickedEventId ??
		(cachedEventId && events.some((event) => event.id === cachedEventId)
			? cachedEventId
			: defaultEventId);

	useEffect(() => {
		if (!result) return;
		const timer = setTimeout(() => setResult(null), 5000);
		return () => clearTimeout(timer);
	}, [result]);

	const isCheckedIn = (eventId: string) =>
		overrides[eventId] ?? checkedInEventIds.includes(eventId);

	const isSelectedCheckedIn = isCheckedIn(selectedEventId);

	// Fires the scan straight through when exactly one event qualifies, so a
	// volunteer doesn't have to tap anything for the common case. Skips
	// re-firing if the hacker is already checked into that event (e.g. a
	// re-scan at the same table).
	useEffect(() => {
		if (!autoCheckInEventId || autoFired.current) return;
		if (checkedInEventIds.includes(autoCheckInEventId)) {
			setIsAutoChecking(false);
			return;
		}

		autoFired.current = true;
		startTransition(async () => {
			const actionResult = await autoCheckInUser(nfcId);
			setResult(actionResult);
			setIsAutoChecking(false);

			if (actionResult.success && actionResult.eventId) {
				setOverrides((previous) => ({ ...previous, [actionResult.eventId as string]: true }));
			}
		});
		// nfcId/autoCheckInEventId only - checkedInEventIds is read once at mount
		// time via autoFired, not tracked, so a later revalidation can't re-fire this.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nfcId, autoCheckInEventId]);

	const handleSelect = (eventId: string) => {
		setPickedEventId(eventId);
		setResult(null);
		window.localStorage.setItem(SELECTED_EVENT_KEY, eventId);
	};

	const runAction = (action: typeof checkInUser, nextCheckedIn: boolean) => {
		if (!selectedEventId) return;

		startTransition(async () => {
			const actionResult = await action(nfcId, selectedEventId);
			setResult(actionResult);

			if (actionResult.success) {
				setOverrides((previous) => ({ ...previous, [selectedEventId]: nextCheckedIn }));
			}
		});
	};

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(checkInUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			console.error("Failed to copy check-in URL:", error);
		}
	};

	return (
		<div className="flex flex-col gap-5">
			{/* Who was scanned */}
			<div className="flex flex-col gap-4 rounded-sm bg-surface-card p-6 shadow-card">
				<div className="flex flex-col gap-1">
					<span className="font-display text-2xl font-medium tracking-tighter text-base-800">
						{profile.fullName || "Name not set"}
					</span>
					<span className="font-body text-[14px] text-sun-400">{profile.email}</span>
				</div>

				<div className="overflow-hidden rounded-sm bg-sun-50">
					<Field label="Team" value={profile.teamName || "No team yet"} />
					<Field label="School" value={profile.school || "Not listed"} />
					<Field label="Program" value={profile.program || "Not listed"} />
					<Field label="Year" value={profile.universityYear || "Not listed"} />
					<Field
						label="Tracks"
						value={profile.tracks.length ? profile.tracks.join(", ") : "Not selected"}
					/>
					<Field
						label="Resume"
						value={profile.resumeUrl ? "View" : "Not on file"}
						href={profile.resumeUrl || undefined}
					/>
				</div>
			</div>

			{/* Check in */}
			<div className="flex flex-col gap-4 rounded-sm bg-surface-card p-6 shadow-card">
				<label
					htmlFor="checkin-event"
					className="font-display text-[12px] font-semibold tracking-tight text-sun-400"
				>
					Event
				</label>

				{noActiveEvent && (
					<p className="font-body text-[13px] text-sun-400">
						No event is running right now - pick one manually.
					</p>
				)}

				{events.length === 0 ? (
					<p className="font-body text-[14px] text-sun-400">
						No events are set up for check-in yet.
					</p>
				) : autoCheckInEventId ? (
					// Exactly one event is active - a one-option dropdown would be
					// noise, so it's locked text instead. Check-in / Undo below still
					// work normally as the manual fallback.
					<div
						id="checkin-event"
						className="flex h-12 w-full items-center rounded-sm border border-black/10 bg-sun-50 px-4 font-body text-[14px] text-base-800"
					>
						{events[0].title} · {formatEventTime(events[0].startsAt)}
						{isCheckedIn(events[0].id) ? " ✓" : ""}
					</div>
				) : (
					<select
						id="checkin-event"
						value={selectedEventId}
						onChange={(event) => handleSelect(event.target.value)}
						disabled={isPending}
						className="h-12 w-full rounded-sm border border-black/10 bg-sun-50 px-4 font-body text-[14px] text-base-800 outline-none transition focus:border-sun-300 focus:bg-white disabled:opacity-50"
					>
						{events.map((event) => (
							<option key={event.id} value={event.id}>
								{event.title} · {formatEventTime(event.startsAt)}
								{isCheckedIn(event.id) ? " ✓" : ""}
							</option>
						))}
					</select>
				)}

				<div className="flex flex-wrap gap-2.5">
					<button
						type="button"
						onClick={() => runAction(checkInUser, true)}
						disabled={!selectedEventId || isPending || isSelectedCheckedIn}
						className="inline-flex h-12 flex-1 items-center justify-center rounded-pill bg-orange px-6 font-display text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
					>
						{isPending
							? isAutoChecking
								? "Checking in…"
								: "Working…"
							: isSelectedCheckedIn
								? "Already checked in"
								: "Check in"}
					</button>

					{isSelectedCheckedIn && (
						<button
							type="button"
							onClick={() => runAction(uncheckInUser, false)}
							disabled={isPending}
							className="inline-flex h-12 items-center justify-center rounded-pill bg-surface-pill px-6 font-display text-[14px] font-medium text-terracotta transition-opacity hover:opacity-80 disabled:opacity-50"
						>
							Undo
						</button>
					)}
				</div>

				{result && (
					<div
						className="rounded-sm px-4 py-3 font-body text-[13px]"
						style={{
							background: result.success ? "rgba(143,194,0,0.12)" : "rgba(189,60,60,0.1)",
							color: result.success ? "#4a6b00" : "var(--terracotta)",
						}}
					>
						{result.message}
					</div>
				)}
			</div>

			{/* Tag provisioning - the URL to write to this hacker's NFC tag */}
			<div className="flex flex-col gap-2.5 rounded-sm bg-surface-card p-6 shadow-card">
				<span className="font-display text-[12px] font-semibold tracking-tight text-sun-400">
					NFC tag URL
				</span>
				<div className="flex items-center gap-3 rounded-sm bg-sun-50 py-2.5 pl-4 pr-2.5">
					<span className="min-w-0 flex-1 break-all font-mono text-[12px] text-base-800">
						{checkInUrl}
					</span>
					<button
						type="button"
						onClick={handleCopy}
						title="Copy to clipboard"
						aria-label="Copy check-in URL to clipboard"
						className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm bg-surface-pill text-text-brand-accent transition-opacity hover:opacity-80"
					>
						{copied ? <Check size={16} /> : <Copy size={16} />}
					</button>
				</div>
				<p className="font-body text-[13px] leading-snug text-sun-400">
					Write this to their tag with an NFC writer app.
				</p>
			</div>
		</div>
	);
}
