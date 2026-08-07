import Link from "next/link";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import type { LegalBlock, LegalInline, LegalSection } from "@/lib/legal/types";

/**
 * Shared renderer for /legal/terms and /legal/privacy - same shape as
 * app/admin/docs/page.tsx's Block/Section pair (sticky TOC derived from the
 * section list, anchor-scrollable sections), trimmed to the four LegalBlock
 * kinds legal copy actually needs.
 */

function Inline({ segment }: { segment: LegalInline }) {
	if (typeof segment === "string") return <>{segment}</>;

	const isMailto = segment.href.startsWith("mailto:");
	return (
		<Link
			href={segment.href}
			{...(!isMailto && { target: "_blank", rel: "noopener noreferrer" })}
			className="text-text-brand-accent underline-offset-2 hover:text-orange hover:underline"
		>
			{segment.text}
		</Link>
	);
}

function Inlines({ segments }: { segments: LegalInline[] }) {
	return (
		<>
			{segments.map((segment, index) => (
				// Inline segments have no stable identity of their own - index is fine, this list never reorders.
				<Inline key={index} segment={segment} />
			))}
		</>
	);
}

function Block({ block }: { block: LegalBlock }) {
	switch (block.kind) {
		case "heading":
			return (
				<h3 className="mt-2 font-display text-[15px] font-semibold tracking-tight text-base-800">
					{block.text}
				</h3>
			);

		case "prose":
			return (
				<p className="max-w-155 font-body text-[14px] leading-relaxed text-base-800">
					<Inlines segments={block.content} />
				</p>
			);

		case "list":
			return (
				<ul className="flex max-w-155 flex-col gap-2.5">
					{block.items.map((item, index) => (
						// Clause text isn't unique across sections - index is fine, this list is static.
						<li key={index} className="flex items-start gap-3">
							<span
								aria-hidden
								className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sun-300"
							/>
							<span className="font-body text-[14px] leading-relaxed text-base-800">
								<Inlines segments={item} />
							</span>
						</li>
					))}
				</ul>
			);

		case "note":
			return (
				<p
					className="max-w-155 rounded-sm px-4 py-3 font-body text-[13px] leading-relaxed text-base-800"
					style={{ background: "var(--sun-50)", borderLeft: "3px solid var(--orange)" }}
				>
					<Inlines segments={block.content} />
				</p>
			);
	}
}

function Section({ section }: { section: LegalSection }) {
	// section.title already carries its own number ("1. Eligibility", matching
	// the source document), so SectionHeader is used without its `number` prop
	// - passing both would print the index twice.
	return (
		<section id={section.id} className="flex scroll-mt-28 flex-col gap-5">
			<SectionHeader title={section.title} />
			{section.blocks.map((block, blockIndex) => (
				<Block key={blockIndex} block={block} />
			))}
		</section>
	);
}

export function LegalDocument({
	intro,
	sections,
	lastUpdated,
	closing,
}: {
	intro: LegalSection;
	sections: LegalSection[];
	lastUpdated: string;
	closing?: string;
}) {
	return (
		<main className="mx-auto flex w-full max-w-290 flex-col gap-9 px-6 py-8 pb-20 sm:px-9">
			<div className="flex flex-col gap-2">
				<h1 className="font-display text-[26px] font-medium tracking-tighter text-base-800">
					{intro.title}
				</h1>
				<span className="font-mono text-[11px] text-sun-400">Last updated {lastUpdated}</span>
				{intro.blocks.map((block, blockIndex) => (
					<Block key={blockIndex} block={block} />
				))}
			</div>

			<div className="grid grid-cols-1 items-start gap-9 lg:grid-cols-[220px_minmax(0,1fr)]">
				<nav aria-label="Contents" className="lg:sticky lg:top-24">
					<span className="font-display text-[12px] font-semibold tracking-tight text-sun-400">
						Contents
					</span>
					<ol className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3 lg:grid-cols-1">
						{sections.map((section, index) => (
							<li key={section.id} className="flex items-baseline gap-2.5">
								<span className="font-mono text-[11px] text-sun-400">{index + 1}</span>
								<a
									href={`#${section.id}`}
									className="font-display text-[13px] font-medium tracking-tight text-text-brand-accent transition-colors hover:text-orange"
								>
									{section.title.replace(/^\d+\.\s*/, "")}
								</a>
							</li>
						))}
					</ol>
				</nav>

				<div className="flex flex-col gap-11">
					{sections.map((section) => (
						<Section key={section.id} section={section} />
					))}
					{closing && (
						<p className="max-w-155 rounded-sm bg-sun-100 p-5 font-body text-[14px] leading-relaxed text-base-800">
							{closing}
						</p>
					)}
				</div>
			</div>
		</main>
	);
}
