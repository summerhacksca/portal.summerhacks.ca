"use client";

import { useState, useTransition } from "react";
import { createTrekTeam, joinTrekTeam } from "@/app/portal/trek/actions";

const inputClass =
	"h-11 w-full rounded-sm border border-black/10 bg-sun-50 px-4 text-[14px] text-base-800 outline-none transition focus:border-sun-300 focus:bg-white";

const buttonClass =
	"inline-flex h-11 w-fit items-center justify-center rounded-pill bg-base-900 px-6 font-display text-[13px] font-medium tracking-tight text-base-0 transition-opacity hover:opacity-80 disabled:opacity-50";

/**
 * The no-team state. Everything else on the page still renders behind this -
 * only logging a photo is withheld - so a hacker who lands here can read the
 * rules and see the board before committing to a team.
 *
 * Both forms just relay the RPC's message on failure; the database is where
 * "that name is taken" and "no team with that code" are decided.
 */
export function TeamGate({ maxTeamSize }: { maxTeamSize: number }) {
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState("");

	function handleCreate(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError("");

		const formData = new FormData(event.currentTarget);

		startTransition(async () => {
			try {
				await createTrekTeam(formData);
			} catch (err) {
				setError((err as Error).message);
			}
		});
	}

	function handleJoin(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError("");

		const formData = new FormData(event.currentTarget);

		startTransition(async () => {
			try {
				await joinTrekTeam(formData);
			} catch (err) {
				setError((err as Error).message);
			}
		});
	}

	return (
		<div className="flex flex-col gap-5 rounded-sm bg-surface-card p-7 shadow-card">
			<div className="flex flex-col gap-1.5">
				<h2 className="font-display text-lg font-medium tracking-tight text-base-800">
					You&apos;re not on a trek team yet
				</h2>
				<p className="max-w-[620px] font-body text-[14px] leading-relaxed text-sun-400">
					Photos are logged as a team, up to {maxTeamSize} hackers. Start one
					and share the code, or enter a code a teammate already has.
				</p>
			</div>

			<div className="grid gap-px overflow-hidden rounded-sm bg-black/[0.08] sm:grid-cols-2">
				<form
					onSubmit={handleCreate}
					className="flex flex-col gap-3 bg-surface-card p-5"
				>
					<label
						htmlFor="team_name"
						className="font-display text-[13px] font-semibold tracking-tight text-base-800"
					>
						Create a team
					</label>
					<input
						id="team_name"
						name="team_name"
						type="text"
						required
						minLength={2}
						maxLength={40}
						placeholder="Fern &amp; Ash"
						autoComplete="off"
						className={inputClass}
					/>
					<p className="font-body text-[13px] text-sun-400">
						You&apos;ll get a 6-character code to share with your teammates.
					</p>
					<button type="submit" disabled={isPending} className={buttonClass}>
						{isPending ? "Working…" : "Create team"}
					</button>
				</form>

				<form
					onSubmit={handleJoin}
					className="flex flex-col gap-3 bg-surface-card p-5"
				>
					<label
						htmlFor="join_code"
						className="font-display text-[13px] font-semibold tracking-tight text-base-800"
					>
						Join a team
					</label>
					<input
						id="join_code"
						name="join_code"
						type="text"
						required
						maxLength={12}
						placeholder="ABC234"
						autoComplete="off"
						autoCapitalize="characters"
						spellCheck={false}
						className={`${inputClass} text-center font-mono uppercase tracking-[0.3em]`}
					/>
					<p className="font-body text-[13px] text-sun-400">
						Ask whoever made the team - it&apos;s on their trek page.
					</p>
					<button type="submit" disabled={isPending} className={buttonClass}>
						{isPending ? "Working…" : "Join team"}
					</button>
				</form>
			</div>

			{error && <p className="font-body text-[13px] text-red-500">{error}</p>}
		</div>
	);
}
