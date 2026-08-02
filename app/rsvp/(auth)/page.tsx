/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ArrowUp } from "lucide-react";

function SelectField({
	label,
	placeholder,
	options,
	name,
	value,
	onChange,
}: {
	label: string;
	placeholder: string;
	options: string[];
	name: string;
	value: string;
	onChange: (name: string, value: string) => void;
}) {
	return (
		<label className="block w-full space-y-4">
			<span className="block text-[15px] leading-5 text-[#3f372f]">
				{label}
			</span>
			<div className="relative">
				<select
					name={name}
					value={value}
					onChange={(e) => onChange(name, e.target.value)}
					className="h-11 w-full appearance-none rounded-sm border border-[#f0d8bc] bg-[#fae9d4] px-4 pr-12 text-[14px] text-[#2f2418] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] outline-none ring-0 transition focus:border-[#e7b56c] focus:bg-[#f8e0bf] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
				>
					<option value="" disabled>
						{placeholder}
					</option>
					{options.map((option) => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
				<ChevronDown
					aria-hidden="true"
					className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#5a4331]"
				/>
			</div>
		</label>
	);
}

	export default function RSVPPage() {
		const [submitting, setSubmitting] = useState(false);
		const [submitMessage, setSubmitMessage] = useState("");
		const [submitError, setSubmitError] = useState("");
		const [hasExistingRsvp, setHasExistingRsvp] = useState(false);
		const [formData, setFormData] = useState({
			participating: "",
			downtown: "",
		});
	
		useEffect(() => {
			fetch("/api/rsvp")
				.then((res) => res.json())
				.then((data) => {
					if (data.rsvp) {
						setHasExistingRsvp(true);
						setFormData({
							participating: data.rsvp.participating,
							downtown: data.rsvp.downtown,
						});
					}
				})
				.catch(() => {});
		}, []);

	const handleFieldChange = (name: string, value: string) => {
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setSubmitMessage("");
		setSubmitError("");

		if (!formData.participating || !formData.downtown) {
			setSubmitError("Please fill out both fields before submitting.");
			setSubmitting(false);
			return;
		}

		try {
			const res = await fetch("/api/rsvp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error ?? "Failed to submit RSVP");
			}

			setSubmitMessage(
				hasExistingRsvp
					? "Your RSVP has been updated. Thank you!"
					: "Your RSVP has been recorded. Thank you!",
			);
		} catch (err) {
			setSubmitError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<main className="relative flex min-h-screen flex-col items-center justify-center gap-16 self-stretch overflow-hidden bg-[#fffaf2] p-3 text-[#221b14]">
			{/* Offsets live in classes rather than inline styles so they can take a
			    breakpoint - the desktop values are tuned for a wide viewport and
			    push the flowers entirely out of frame on a phone. <main> is
			    overflow-hidden, so they bleed off-edge without causing page scroll. */}
			<img
				src="/assets/flower1.png"
				alt=""
				className="pointer-events-none absolute bottom-[-260px] left-[-180px] scale-[0.28] select-none md:bottom-[-502px] md:left-[-380px] md:scale-50"
			/>
			<img
				src="/assets/flower2.png"
				alt=""
				className="pointer-events-none absolute bottom-[-420px] right-[-150px] scale-[0.28] select-none md:bottom-[-794px] md:right-[-311px] md:scale-50"
			/>
			<img
				src="/assets/flower3.png"
				alt=""
				className="pointer-events-none absolute right-[-190px] top-[-150px] scale-[0.28] select-none md:right-[-377px] md:top-[-287px] md:scale-50"
			/>
			<img
				src="/assets/flower4.png"
				alt=""
				className="pointer-events-none absolute left-[-200px] top-[-200px] scale-[0.28] select-none md:left-[-397px] md:top-[-388px] md:scale-50"
			/>
			<div className="relative z-10 flex w-full flex-col items-start gap-12 self-stretch p-5 sm:p-9 sm:gap-25">
				<section className="flex w-full flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
					<div className="flex flex-col items-start justify-center gap-8 self-stretch py-6 sm:py-12">
						{/* Three 200px oranges are 600px+ of row - below md they shrink to
						    a single 90px row and the second row drops entirely. */}
						<div className="flex items-start justify-start gap-4">
							<img
								src="/assets/orange.svg"
								alt=""
								className="h-[90px] w-auto md:h-[200px]"
							/>
							<img
								src="/assets/orange.svg"
								alt=""
								className="h-[90px] w-auto md:h-[200px]"
							/>
							<img
								src="/assets/orange.svg"
								alt=""
								className="h-[90px] w-auto md:h-[200px]"
							/>
						</div>

						<div className="space-y-3">
							<h2 className="text-[22px] font-medium leading-tight tracking-[-0.03em] text-[#F80] sm:text-[32px]">
								Welcome to SummerHacks!
							</h2>
							<p className="text-[22px] leading-tight tracking-[-0.03em] text-[#15110d] sm:text-[32px]">
								SummerHacks will be hosted in Downtown Toronto.
								RSVP to join us under the sun.
							</p>
						</div>

						<div className="hidden items-start justify-start gap-4 md:flex">
							<img
								src="/assets/orange.svg"
								alt=""
								className="h-[200px] w-auto"
							/>
							<img
								src="/assets/orange.svg"
								alt=""
								className="h-[200px] w-auto"
							/>
							<img
								src="/assets/orange.svg"
								alt=""
								className="h-[200px] w-auto"
							/>
						</div>
					</div>

					<form
						onSubmit={handleSubmit}
						className="flex w-full max-w-full flex-col items-start justify-center gap-5 self-stretch"
					>
						<header className="w-full space-y-4">
							<h1 className="text-[26px] font-medium leading-none tracking-[-0.04em] text-[#15110d] sm:text-[31px] md:text-[33px]">
								SummerHacker RSVP
							</h1>
							<p className="max-w-152 text-[18px] leading-[1.08] tracking-[-0.03em] text-[#2f2a26] sm:text-[22px] md:text-[26px]">
								SummerHacks will be hosted in Downtown Toronto.
								RSVP to join us under the sun.
							</p>
						</header>

						<div className="w-full space-y-5 pt-4">
							<SelectField
								name="participating"
								label="Will you be participating in SummerHacks?"
								placeholder="Count me in / No"
								options={["Count me in", "No"]}
								value={formData.participating}
								onChange={handleFieldChange}
							/>

							<SelectField
								name="downtown"
								label="Will you joining us in Downtown Toronto for the entirety of the event?"
								placeholder="Yes / No"
								options={["Yes", "No"]}
								value={formData.downtown}
								onChange={handleFieldChange}
							/>
						</div>

						{submitError && (
							<p className="text-[13px] text-red-500">
								{submitError}
							</p>
						)}
						{submitMessage && (
							<p className="text-[13px] text-green-600">
								{submitMessage}
							</p>
						)}

						<button
							type="submit"
							disabled={submitting}
							className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[100px] bg-[#F80] px-6 text-white transition-colors hover:bg-[#e67300] disabled:opacity-50 sm:w-auto sm:self-start"
						>
							{submitting
								? "Submitting..."
								: hasExistingRsvp
									? "Update RSVP"
									: "Submit"}
							<ArrowUp size={20} className="rotate-90" />
						</button>
					</form>
				</section>
			</div>
		</main>
	);
}
