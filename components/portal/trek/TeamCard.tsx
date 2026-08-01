"use client";

import { Check, Copy } from "lucide-react";
import { useState, useTransition } from "react";
import { leaveTrekTeam } from "@/app/portal/trek/actions";
import type { MyScavengerTeam } from "@/lib/portal/types";

/**
 * The hacker's own team: name, the join code to pass around, who's on it, and
 * what they've scored. Leaving is only offered while the team has no photos -
 * points belong to the team, so a roster that has already scored is frozen
 * (the RPC enforces this too).
 */
export function TeamCard({
	team,
	points,
	spotsFound,
	maxTeamSize,
	canLeave,
}: {
	team: MyScavengerTeam;
	points: number;
	spotsFound: number;
	maxTeamSize: number;
	canLeave: boolean;
}) {
	const [isPending, startTransition] = useTransition();
	const [copied, setCopied] = useState(false);
	const [error, setError] = useState("");

	function handleCopy() {
		navigator.clipboard.writeText(team.join_code).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}

	function handleLeave() {
		setError("");

		startTransition(async () => {
			try {
				await leaveTrekTeam();
			} catch (err) {
				setError((err as Error).message);
			}
		});
	}

	return (
		<div className="flex flex-col gap-5 rounded-sm bg-surface-card p-7 shadow-card">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h2 className="font-display text-xl font-medium tracking-tighter text-base-800">
						{team.team_name}
					</h2>
					<span className="font-mono text-[12px] text-sun-400">
						{team.member_count} of {maxTeamSize} · {points}{" "}
						{points === 1 ? "pt" : "pts"} · {spotsFound}{" "}
						{spotsFound === 1 ? "spot" : "spots"} found
					</span>
				</div>

				<div className="flex flex-col items-end gap-1.5">
					<span className="font-display text-[11px] font-semibold tracking-tight text-sun-400">
						Join code
					</span>
					<button
						type="button"
						onClick={handleCopy}
						className="inline-flex h-11 items-center gap-2.5 rounded-pill bg-surface-pill px-5 font-mono text-[15px] tracking-[0.2em] text-base-800 transition-opacity hover:opacity-80"
					>
						{team.join_code}
						{copied ? (
							<Check size={15} color="var(--green)" />
						) : (
							<Copy size={15} color="var(--sun-400)" />
						)}
					</button>
				</div>
			</div>

			{team.members.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{team.members.map((member) => (
						<span
							key={member}
							className="inline-flex items-center whitespace-nowrap rounded-pill bg-sun-100 px-2.5 py-1 font-display text-[11px] font-medium tracking-tight text-sun-400"
						>
							{member || "Unnamed hacker"}
						</span>
					))}
				</div>
			)}

			{canLeave && (
				<div className="flex flex-wrap items-center gap-4 border-t border-black/[0.06] pt-5">
					<button
						type="button"
						onClick={handleLeave}
						disabled={isPending}
						className="inline-flex h-10 items-center justify-center rounded-pill bg-surface-pill px-5 font-display text-[13px] font-medium tracking-tight text-terracotta transition-opacity hover:opacity-80 disabled:opacity-50"
					>
						{isPending ? "Leaving…" : "Leave team"}
					</button>
					<span className="font-body text-[13px] text-sun-400">
						You can leave until your team logs its first photo.
					</span>
				</div>
			)}

			{error && <p className="font-body text-[13px] text-red-500">{error}</p>}
		</div>
	);
}
