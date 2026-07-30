import Link from "next/link";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { getCheckinEvents } from "@/lib/portal/queries";

const TIME_ZONE = "America/Toronto";

function formatEventTime(iso: string) {
	return new Date(iso).toLocaleString("en-US", {
		weekday: "short",
		hour: "numeric",
		minute: "2-digit",
		timeZone: TIME_ZONE,
	});
}

export default async function AdminHomePage() {
	const events = await getCheckinEvents();

	return (
		<main className="mx-auto flex w-full max-w-[1160px] flex-col gap-9 px-6 py-8 pb-20 sm:px-9">
			<SectionHeader title="Staff tools" />

			<section className="flex flex-col gap-4 rounded-sm bg-surface-card p-7 shadow-card">
				<h2 className="font-display text-lg font-medium tracking-tight text-base-800">
					Checking hackers in
				</h2>
				<p className="max-w-[620px] font-body text-[14px] leading-relaxed text-base-800">
					Scan a hacker&apos;s QR code with your phone camera, or tap their NFC
					tag. Both open their check-in page directly — you don&apos;t need to
					come back here first. Pick the event, hit Check in, done.
				</p>
				<Link
					href="/admin/nfc-tags"
					className="font-display text-sm font-medium tracking-tight text-text-brand-accent hover:text-orange"
				>
					Provision NFC tags →
				</Link>
			</section>

			<section className="flex flex-col gap-5">
				<SectionHeader
					title="Events that need check-in"
					trailing={
						<span className="font-mono text-[11px] text-sun-400">
							meals and registration only
						</span>
					}
				/>
				{events.length === 0 ? (
					<p className="font-body text-[14px] text-sun-400">
						No events are set up for check-in yet.
					</p>
				) : (
					<div className="overflow-hidden rounded-sm bg-surface-card shadow-card">
						{events.map((event) => (
							<div
								key={event.id}
								className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] px-6 py-4 first:border-t-0"
							>
								<div className="flex flex-col gap-0.5">
									<span className="font-display text-[15px] font-medium tracking-tight text-base-800">
										{event.title}
									</span>
									<span className="font-body text-[13px] text-sun-400">
										{event.location}
									</span>
								</div>
								<span className="font-mono text-[12px] text-base-800">
									{formatEventTime(event.starts_at)}
								</span>
							</div>
						))}
					</div>
				)}
			</section>
		</main>
	);
}
