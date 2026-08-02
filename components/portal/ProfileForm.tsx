"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/app/portal/actions";
import type { Track } from "@/lib/portal/types";

const inputClass =
	"h-11 w-full rounded-sm border border-black/10 bg-sun-50 px-4 text-[14px] text-base-800 outline-none transition focus:border-sun-300 focus:bg-white";

export function ProfileForm({
	fullName,
	teamName,
	school,
	tracks,
	allTracks,
}: {
	fullName: string;
	teamName: string;
	school: string;
	tracks: string[];
	allTracks: Track[];
}) {
	const [isPending, startTransition] = useTransition();
	const [selectedTracks, setSelectedTracks] = useState<string[]>(tracks);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	function toggleTrack(name: string) {
		setSelectedTracks((prev) =>
			prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
		);
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setMessage("");
		setError("");

		const formData = new FormData(e.currentTarget);
		formData.delete("tracks");
		selectedTracks.forEach((t) => formData.append("tracks", t));

		startTransition(async () => {
			try {
				await updateProfile(formData);
				setMessage("Profile updated.");
			} catch (err) {
				setError((err as Error).message);
			}
		});
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5">
			<label className="flex flex-col gap-2">
				<span className="font-body text-[13px] text-sun-400">Full name</span>
				<input
					name="full_name"
					defaultValue={fullName}
					placeholder="Jordan Alvarez"
					className={inputClass}
				/>
			</label>

			<label className="flex flex-col gap-2">
				<span className="font-body text-[13px] text-sun-400">Team name</span>
				<input
					name="team_name"
					defaultValue={teamName}
					placeholder="Team Fern & Ash"
					className={inputClass}
				/>
			</label>

			<label className="flex flex-col gap-2">
				<span className="font-body text-[13px] text-sun-400">School</span>
				<input
					name="school"
					defaultValue={school}
					placeholder="University of Toronto"
					className={inputClass}
				/>
			</label>

			<div className="flex flex-col gap-2">
				<span className="font-body text-[13px] text-sun-400">
					Track selection
				</span>
				<div className="flex flex-wrap gap-2">
					{allTracks.map((track) => {
						const selected = selectedTracks.includes(track.name);
						return (
							<button
								key={track.slug}
								type="button"
								onClick={() => toggleTrack(track.name)}
								className={`rounded-pill px-4 py-2 font-display text-[13px] font-medium tracking-tight transition-colors ${
									selected
										? "bg-base-900 text-base-0"
										: "bg-sun-100 text-base-800 hover:bg-sun-100/70"
								}`}
							>
								{track.name}
							</button>
						);
					})}
				</div>
			</div>

			{error && <p className="font-body text-[13px] text-red-500">{error}</p>}
			{message && (
				<p className="font-body text-[13px] text-green-600">{message}</p>
			)}

			<button
				type="submit"
				disabled={isPending}
				className="inline-flex h-11 w-fit items-center justify-center rounded-pill bg-base-900 px-6 font-display text-[13px] font-medium tracking-tight text-base-0 transition-opacity hover:opacity-80 disabled:opacity-50"
			>
				{isPending ? "Saving…" : "Save changes"}
			</button>
		</form>
	);
}
