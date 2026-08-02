"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/portal/types";

export function FaqAccordion({ items }: { items: FaqItem[] }) {
	const [openId, setOpenId] = useState<string | null>(null);

	return (
		<div className="flex flex-col gap-px overflow-hidden rounded-sm bg-black/[0.08]">
			{items.map((item) => {
				const open = openId === item.id;
				return (
					<div key={item.id} className="bg-surface-card">
						<button
							type="button"
							onClick={() => setOpenId(open ? null : item.id)}
							className="flex w-full items-center justify-between gap-4 px-5 py-4.5 text-left"
						>
							<span className="font-display text-[15px] font-medium tracking-tight text-base-800">
								{item.question}
							</span>
							<span className="font-display text-lg text-sun-400">
								{open ? "−" : "+"}
							</span>
						</button>
						{open && (
							<p className="px-5 pb-5 font-body text-[14px] leading-relaxed text-base-800">
								{item.answer}
							</p>
						)}
					</div>
				);
			})}
		</div>
	);
}
