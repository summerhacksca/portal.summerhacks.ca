"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import { checkInUser, uncheckInUser, type CheckinResult } from "@/app/admin/actions";

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

function Field({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-black/[0.06] px-5 py-3 first:border-t-0">
			<span className="font-display text-[12px] font-semibold tracking-tight text-sun-400">
				{label}
			</span>
			<span className="font-body text-[14px] text-base-800">{value}</span>
		</div>
	);
}

export function CheckinPanel({
	nfcId,
	checkInUrl,
	profile,
	events,
	defaultEventId,
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
	};
	events: CheckinEvent[];
	defaultEventId: string;
	checkedInEventIds: string[];
}) {
	const [pickedEventId, setPickedEventId] = useState<string | null>(null);
	// Overlay on top of the server's check-in state rather than a copy of it, so a
	// revalidation can't be clobbered by stale local state.
	const [overrides, setOverrides] = useState<Record<string, boolean>>({});
	const [result, setResult] = useState<CheckinResult | null>(null);
	const [copied, setCopied] = useState(false);
	const [isPending, startTransition] = useTransition();

	const cachedEventId = useSyncExternalStore(
		subscribeToStorage,
		readCachedEventId,
		readCachedEventIdOnServer,
	);

	const selectedEventId =
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
					<Field
						label="Tracks"
						value={profile.tracks.length ? profile.tracks.join(", ") : "Not selected"}
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

				{events.length === 0 ? (
					<p className="font-body text-[14px] text-sun-400">
						No events are set up for check-in yet.
					</p>
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
							? "Working…"
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

			{/* Tag provisioning — the URL to write to this hacker's NFC tag */}
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
