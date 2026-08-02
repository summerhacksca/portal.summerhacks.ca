"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { updateUserRole } from "@/app/admin/actions";
import type { CheckinResult } from "@/app/admin/actions";
import { UserRoleBadge } from "@/components/admin/UserRoleBadge";
import { canEditRole, USER_ROLES } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/auth/roles";
import type { StaffMember } from "@/lib/portal/types";

/** Roles selectable from this UI, in display order - superadmin is never offered. */
const ASSIGNABLE_ROLES: UserRole[] = USER_ROLES.filter((role) => role !== "superadmin");

function roleLabel(role: UserRole) {
	return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * One row per person with a role <select> + Save when the viewer may change
 * it, or a read-only badge otherwise. canEditRole() (lib/auth/roles.ts) is the
 * same predicate public.admin_set_user_role() enforces server-side, kept in
 * one place so the UI and the database can't drift - this component decides
 * what to show, the RPC is still the real gate.
 *
 * Decisions are held in an overrides overlay rather than mutating `people`, so
 * a revalidation from elsewhere doesn't clobber in-flight edits (same shape as
 * TrekReviewList).
 */
export function StaffRoleList({
	people,
	viewerRole,
	viewerId,
}: {
	people: StaffMember[];
	viewerRole: UserRole;
	viewerId: string;
}) {
	const [isPending, startTransition] = useTransition();
	const [query, setQuery] = useState("");
	const [overrides, setOverrides] = useState<Record<string, UserRole>>({});
	const [drafts, setDrafts] = useState<Record<string, UserRole>>({});
	const [result, setResult] = useState<CheckinResult | null>(null);

	useEffect(() => {
		if (!result) return;
		const timer = setTimeout(() => setResult(null), 5000);
		return () => clearTimeout(timer);
	}, [result]);

	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return people;

		return people.filter(
			(person) =>
				person.full_name.toLowerCase().includes(needle) ||
				person.email.toLowerCase().includes(needle),
		);
	}, [people, query]);

	function save(person: StaffMember, role: UserRole, draft: UserRole) {
		if (draft === role) return;

		startTransition(async () => {
			const actionResult = await updateUserRole(person.user_id, draft);
			setResult(actionResult);

			if (actionResult.success) {
				setOverrides((previous) => ({ ...previous, [person.user_id]: draft }));
			}
		});
	}

	if (people.length === 0) {
		return <p className="font-body text-[14px] text-sun-400">Nobody here yet.</p>;
	}

	const options =
		viewerRole === "superadmin"
			? ASSIGNABLE_ROLES
			: ASSIGNABLE_ROLES.filter((option) => option !== "organizer");

	return (
		<div className="flex flex-col gap-5">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<input
					type="search"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Filter by name or email"
					aria-label="Filter by name or email"
					className="h-11 w-full max-w-105 rounded-sm border border-black/10 bg-sun-50 px-4 font-body text-[14px] text-base-800 outline-none transition focus:border-sun-300 focus:bg-white"
				/>

				{result && (
					<span
						className="rounded-pill px-4 py-2 font-body text-[13px]"
						style={{
							background: result.success ? "rgba(143,194,0,0.12)" : "rgba(189,60,60,0.1)",
							color: result.success ? "var(--base-800)" : "var(--terracotta)",
						}}
					>
						{result.message}
					</span>
				)}
			</div>

			{filtered.length === 0 ? (
				<p className="font-body text-[14px] text-sun-400">
					No matches for “{query.trim()}”.
				</p>
			) : (
				<div className="overflow-hidden rounded-sm bg-surface-card shadow-card">
					{filtered.map((person) => {
						const role = overrides[person.user_id] ?? person.role;
						const editable = canEditRole(
							{ role: viewerRole, userId: viewerId },
							{ role, userId: person.user_id },
						);
						const draft = drafts[person.user_id] ?? role;

						return (
							<div
								key={person.user_id}
								className="flex flex-wrap items-center gap-4 border-t border-black/6 px-5 py-4 first:border-t-0"
							>
								<div className="flex min-w-45 flex-1 flex-col gap-0.5">
									<span className="font-display text-[15px] font-medium tracking-tight text-base-800">
										{person.full_name || "Name not set"}
									</span>
									<span className="font-body text-[13px] text-sun-400">{person.email}</span>
								</div>

								{editable ? (
									<div className="flex shrink-0 items-center gap-2.5">
										<select
											value={draft}
											onChange={(event) =>
												setDrafts((previous) => ({
													...previous,
													[person.user_id]: event.target.value as UserRole,
												}))
											}
											className="h-10 rounded-sm border border-black/10 bg-sun-50 px-3 font-body text-[13px] text-base-800 outline-none transition focus:border-sun-300 focus:bg-white"
										>
											{options.map((option) => (
												<option key={option} value={option}>
													{roleLabel(option)}
												</option>
											))}
										</select>
										<button
											type="button"
											onClick={() => save(person, role, draft)}
											disabled={isPending || draft === role}
											className="inline-flex h-10 items-center justify-center rounded-pill bg-base-900 px-4 font-display text-[13px] font-medium tracking-tight text-base-0 transition-opacity hover:opacity-80 disabled:opacity-50"
										>
											Save
										</button>
									</div>
								) : (
									<UserRoleBadge role={role} />
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
