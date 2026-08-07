"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { acceptCurrentTerms } from "@/app/legal/actions";

/**
 * Blocking re-consent screen. Rendered by app/portal/layout.tsx and
 * app/admin/layout.tsx *in place of* the page - not as an overlay on top of
 * it - whenever hasAcceptedCurrentTerms() (lib/portal/queries.ts) comes back
 * false for a signed-in user. That's what makes this non-bypassable: the
 * gated page's markup is never sent to the browser, so there's nothing to
 * dismiss, close, or delete out of the DOM to see through it.
 *
 * Deliberately has none of the drawer/dialog dismissal mechanics used
 * elsewhere in this codebase (TrekRulesDrawer, CheckinDrawer): no Escape
 * handler, no backdrop click, no close button. Reusing their bottom-sheet
 * styling instead of their behavior.
 */
export function TermsAcceptance() {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState("");

	function handleAccept() {
		setError("");
		startTransition(async () => {
			try {
				await acceptCurrentTerms();
				router.refresh();
			} catch (err) {
				setError((err as Error).message);
			}
		});
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5">
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="terms-acceptance-title"
				className="flex w-full max-w-[520px] flex-col gap-6 rounded-sm bg-surface-card p-6 shadow-pop sm:p-8"
			>
				<div className="flex flex-col gap-2">
					<h2
						id="terms-acceptance-title"
						className="font-display text-xl font-medium tracking-tighter text-base-800"
					>
						We&apos;ve updated our Terms of Use
					</h2>
					<p className="font-body text-[14px] leading-relaxed text-sun-400">
						We&apos;ve published a Terms of Use and Privacy Policy for SummerHacks and this portal.
						Please take a moment to read them - you&apos;ll need to agree before continuing.
					</p>
				</div>

				<div className="flex flex-col gap-2.5">
					<Link
						href="/legal/terms"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 font-display text-[13px] font-medium tracking-tight text-text-brand-accent hover:text-orange"
					>
						Read the Terms of Use ↗
					</Link>
					<Link
						href="/legal/privacy"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 font-display text-[13px] font-medium tracking-tight text-text-brand-accent hover:text-orange"
					>
						Read the Privacy Policy ↗
					</Link>
				</div>

				{error && (
					<p className="font-body text-[13px] text-red" role="alert">
						{error}
					</p>
				)}

				<button
					type="button"
					onClick={handleAccept}
					disabled={isPending}
					className="h-11 self-center rounded-pill bg-base-900 px-6 font-display text-[13px] font-medium tracking-tight text-base-0 transition-opacity hover:opacity-80 disabled:opacity-50"
				>
					{isPending ? "Saving…" : "I agree and continue"}
				</button>
			</div>
		</div>
	);
}
