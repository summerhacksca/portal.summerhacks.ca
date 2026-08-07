import Link from "next/link";
import { OrangeGlyph } from "./ui/icons";

export function PortalFooter() {
	return (
		<footer className="mt-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-surface-community px-6 py-7 sm:px-9">
			<span className="inline-flex items-center gap-2 font-body text-[13px] text-white">
				<OrangeGlyph size={14} color="var(--sun-300)" stemColor="#fff" />
				Copyright © SummerHacks {new Date().getFullYear()}
			</span>
			<div className="flex flex-wrap items-center gap-x-5 gap-y-2">
				<Link
					href="/legal/terms"
					className="font-body text-[13px] text-white/80 hover:text-white"
				>
					Terms of Use
				</Link>
				<Link
					href="/legal/privacy"
					className="font-body text-[13px] text-white/80 hover:text-white"
				>
					Privacy Policy
				</Link>
				<span className="font-body text-[13px] text-white/80">
					Stuck? Ask an volunteer in a red shirt.
				</span>
			</div>
		</footer>
	);
}
