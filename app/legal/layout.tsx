import Image from "next/image";
import Link from "next/link";
import { PortalFooter } from "@/components/portal/PortalFooter";

/**
 * Shell for the public legal pages (/legal/terms, /legal/privacy). Deliberately
 * not PortalHeader - that component needs a signed-in profile and a five-tab
 * nav bar that doesn't apply here. These pages must render for a signed-out
 * visitor (the acceptance screen links out to them), so the header is just the
 * wordmark linking back to /portal. PortalFooter takes no props and is reused
 * as-is.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col bg-surface-page">
			<header className="border-b border-black/8 bg-sun-50/90 px-6 py-3.5 backdrop-blur-sm sm:px-9">
				<Link href="/portal" className="flex w-fit shrink-0 items-center gap-2.5">
					<Image src="/icon.svg" alt="SummerHacks" width={26} height={26} className="rounded-full" />
					<div className="flex flex-col leading-[1.15]">
						<span className="font-display text-[15px] font-semibold tracking-tighter text-base-800">
							SummerHacks
						</span>
						<span className="font-display text-[11px] font-medium tracking-tight text-sun-400">
							Hacker Portal
						</span>
					</div>
				</Link>
			</header>
			{children}
			<PortalFooter />
		</div>
	);
}
