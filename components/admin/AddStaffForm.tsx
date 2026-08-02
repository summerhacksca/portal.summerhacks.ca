"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { inviteStaff } from "@/app/admin/actions";
import type { CheckinResult } from "@/app/admin/actions";

const inputClass =
	"h-11 w-full rounded-sm border border-black/10 bg-sun-50 px-4 text-[14px] text-base-800 outline-none transition focus:border-sun-300 focus:bg-white";

const labelClass = "font-display text-[13px] font-semibold tracking-tight text-base-800";

/**
 * Adds a brand-new staff account. Staff never submit an application, so
 * unlike promoting a hacker there is no existing auth.users row to promote -
 * inviteStaff() creates one (email_confirm: true, no separate invite email)
 * so the new staffer's first sign-in is the same magic-link flow as
 * everyone else's, once their profile is provisioned.
 */
export function AddStaffForm({ canAddOrganizer }: { canAddOrganizer: boolean }) {
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
			const actionResult = await inviteStaff(formData);
			setResult(actionResult);
			if (actionResult.success) formRef.current?.reset();
		});
	}

	return (
		<form
			ref={formRef}
			onSubmit={handleSubmit}
			className="flex flex-col gap-5 rounded-sm bg-surface-card p-5 shadow-card sm:p-7"
		>
			<div className="grid gap-4 sm:grid-cols-3">
				<div className="flex flex-col gap-2">
					<label htmlFor="email" className={labelClass}>
						Email
					</label>
					<input
						id="email"
						name="email"
						type="email"
						required
						placeholder="name@uwaterloo.ca"
						className={inputClass}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label htmlFor="full_name" className={labelClass}>
						Full name
					</label>
					<input id="full_name" name="full_name" type="text" className={inputClass} />
				</div>

				<div className="flex flex-col gap-2">
					<label htmlFor="role" className={labelClass}>
						Role
					</label>
					<select id="role" name="role" defaultValue="volunteer" className={inputClass}>
						<option value="volunteer">Volunteer</option>
						{canAddOrganizer && <option value="organizer">Organizer</option>}
					</select>
				</div>
			</div>

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
				{isPending ? "Adding…" : "Add staff member"}
			</button>
		</form>
	);
}
