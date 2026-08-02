import { OrangeGlyph } from "./ui/icons";

export function PortalFooter() {
	return (
		<footer className="mt-auto flex flex-wrap items-center justify-between gap-3 bg-surface-community px-6 py-7 sm:px-9">
			<span className="inline-flex items-center gap-2 font-body text-[13px] text-white">
				<OrangeGlyph size={14} color="var(--sun-300)" stemColor="#fff" />
				Copyright © SummerHacks {new Date().getFullYear()}
			</span>
			<span className="font-body text-[13px] text-white/80">
				Stuck? Ask a volunteer wearing an orange lanyard.
			</span>
		</footer>
	);
}
