"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createAnnouncement } from "@/app/admin/actions";
import type { CheckinResult } from "@/app/admin/actions";
import { ANNOUNCEMENT_ACCENTS } from "@/lib/portal/announcementAccents";

const inputClass =
	"h-11 w-full rounded-sm border border-black/10 bg-sun-50 px-4 text-[14px] text-base-800 outline-none transition focus:border-sun-300 focus:bg-white";

const labelClass = "font-display text-[13px] font-semibold tracking-tight text-base-800";

/**
 * Drafts a new announcement. Saving always writes the public.announcements
 * row first (createAnnouncement) - the Discord ping, if checked, is a
 * best-effort follow-up through the same DISCORD_WEBHOOK_URL that
 * app/api/events/notify/route.ts already posts to.
 */
export function AnnouncementComposer() {
	const [isPending, startTransition] = useTransition();
	const [result, setResult] = useState<CheckinResult | null>(null);
	const formRef = useRef<HTMLFormElement>(null);

	useEffect(() => {
		if (!result) return;
		const timer = setTimeout(() => setResult(null), 5000);
		return () => clearTimeout(timer);
	}, [result]);

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);

		startTransition(async () => {
			const actionResult = await createAnnouncement(formData);
			setResult(actionResult);
			if (actionResult.success) formRef.current?.reset();
		});
	}

	return (
		<form
			ref={formRef}
			onSubmit={handleSubmit}
			className="flex flex-col gap-5 rounded-sm bg-surface-card p-7 shadow-card"
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="flex flex-col gap-2">
					<label htmlFor="channel" className={labelClass}>
						Channel
					</label>
					<input
						id="channel"
						name="channel"
						type="text"
						defaultValue="announcements"
						required
						className={inputClass}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label htmlFor="accent" className={labelClass}>
						Accent
					</label>
					<select id="accent" name="accent" defaultValue="normal" className={inputClass}>
						{ANNOUNCEMENT_ACCENTS.map((accent) => (
							<option key={accent.key} value={accent.key}>
								{accent.label}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<label htmlFor="body" className={labelClass}>
					Message
				</label>
				<textarea
					id="body"
					name="body"
					required
					rows={4}
					maxLength={500}
					placeholder="Breakfast is live in The Yard until 9:30 - grab something before workshops start."
					className="w-full resize-none rounded-sm border border-black/10 bg-sun-50 px-4 py-3 text-[14px] text-base-800 outline-none transition focus:border-sun-300 focus:bg-white"
				/>
			</div>

			<label className="flex w-fit items-center gap-3 font-body text-[14px] text-base-800">
				<input
					name="post_to_discord"
					type="checkbox"
					defaultChecked
					className="h-4 w-4 accent-black"
				/>
				Also post to Discord
			</label>

			{result && (
				<p
					className="rounded-sm px-4 py-3 font-body text-[13px]"
					style={{
						background: result.success ? "rgba(143,194,0,0.12)" : "rgba(189,60,60,0.1)",
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
				{isPending ? "Posting…" : "Post announcement"}
			</button>
		</form>
	);
}
