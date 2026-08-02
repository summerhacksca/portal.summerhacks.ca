"use client";

import { useEffect, useState, useTransition } from "react";
import { updateTrekSettings } from "@/app/admin/actions";
import type { CheckinResult } from "@/app/admin/actions";
import type { ScavengerSettings } from "@/lib/portal/types";

const inputClass =
	"h-11 w-full rounded-sm border border-black/10 bg-sun-50 px-4 text-[14px] text-base-800 outline-none transition focus:border-sun-300 focus:bg-white";

const labelClass =
	"font-display text-[13px] font-semibold tracking-tight text-base-800";

/**
 * When the trek runs, and the knobs behind it. `is_open` is a kill switch
 * independent of the schedule - flip it off and the hunt closes immediately,
 * whatever the clock says. All of it is enforced by a DB trigger on insert,
 * not just here.
 *
 * Set cooldown to 1-2 minutes to test the whole flow, then put it back to 60.
 */
export function TrekSettingsForm({
	settings,
	startsLocal,
	endsLocal,
}: {
	settings: ScavengerSettings | null;
	/** Pre-formatted for <input type="datetime-local"> in Toronto time. */
	startsLocal: string;
	endsLocal: string;
}) {
	const [isPending, startTransition] = useTransition();
	const [result, setResult] = useState<CheckinResult | null>(null);

	useEffect(() => {
		if (!result) return;
		const timer = setTimeout(() => setResult(null), 5000);
		return () => clearTimeout(timer);
	}, [result]);

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);

		startTransition(async () => {
			setResult(await updateTrekSettings(formData));
		});
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-5 rounded-sm bg-surface-card p-5 shadow-card sm:p-7"
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="flex flex-col gap-2">
					<label htmlFor="starts_at" className={labelClass}>
						Opens (Toronto time)
					</label>
					<input
						id="starts_at"
						name="starts_at"
						type="datetime-local"
						required
						defaultValue={startsLocal}
						className={inputClass}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label htmlFor="ends_at" className={labelClass}>
						Standings lock (Toronto time)
					</label>
					<input
						id="ends_at"
						name="ends_at"
						type="datetime-local"
						required
						defaultValue={endsLocal}
						className={inputClass}
					/>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-4">
				<div className="flex flex-col gap-2">
					<label htmlFor="cooldown_minutes" className={labelClass}>
						Cooldown (min)
					</label>
					<input
						id="cooldown_minutes"
						name="cooldown_minutes"
						type="number"
						min={1}
						max={1440}
						required
						defaultValue={settings?.cooldown_minutes ?? 60}
						className={inputClass}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label htmlFor="max_team_size" className={labelClass}>
						Max team size
					</label>
					<input
						id="max_team_size"
						name="max_team_size"
						type="number"
						min={1}
						max={20}
						required
						defaultValue={settings?.max_team_size ?? 4}
						className={inputClass}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label htmlFor="new_spot_points" className={labelClass}>
						New spot pts
					</label>
					<input
						id="new_spot_points"
						name="new_spot_points"
						type="number"
						min={0}
						max={100}
						required
						defaultValue={settings?.new_spot_points ?? 2}
						className={inputClass}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label htmlFor="repeat_spot_points" className={labelClass}>
						Repeat spot pts
					</label>
					<input
						id="repeat_spot_points"
						name="repeat_spot_points"
						type="number"
						min={0}
						max={100}
						required
						defaultValue={settings?.repeat_spot_points ?? 1}
						className={inputClass}
					/>
				</div>
			</div>

			<label className="flex w-fit items-center gap-3 font-body text-[14px] text-base-800">
				<input
					name="is_open"
					type="checkbox"
					defaultChecked={settings?.is_open ?? true}
					className="h-4 w-4 accent-black"
				/>
				Hunt is open (uncheck to close it immediately, whatever the schedule
				says)
			</label>

			{result && (
				<p
					className="rounded-sm px-4 py-3 font-body text-[13px]"
					style={{
						background: result.success
							? "rgba(143,194,0,0.12)"
							: "rgba(189,60,60,0.1)",
						color: result.success ? "var(--base-800)" : "var(--terracotta)",
					}}
				>
					{result.message}
				</p>
			)}

			<button
				type="submit"
				disabled={isPending}
				className="inline-flex h-11 w-fit items-center justify-center rounded-pill bg-base-900 px-6 font-display text-[13px] font-medium tracking-tight text-base-0 transition-opacity hover:opacity-80 disabled:opacity-50"
			>
				{isPending ? "Saving…" : "Save settings"}
			</button>
		</form>
	);
}
