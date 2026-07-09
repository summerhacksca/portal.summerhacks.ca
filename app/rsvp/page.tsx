/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ArrowUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [submitMessage, setSubmitMessage] = useState("");
	const [submitError, setSubmitError] = useState("");
	const [formData, setFormData] = useState({
		participating: "",
		downtown: "",
	});

	useEffect(() => {
		const checkAuth = async () => {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				router.replace("/rsvp/login");
				return;
			}

			setLoading(false);
		};

		checkAuth();
	}, [router]);

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

			setSubmitMessage("Your RSVP has been recorded. Thank you!");
		} catch (err) {
			setSubmitError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-[#fffaf2]">
				<p className="text-[#2f2a26]">Loading...</p>
			</main>
		);
	}

	return (
		<main className="relative flex min-h-screen flex-col items-center justify-center gap-16 self-stretch overflow-hidden bg-[#fffaf2] p-3 text-[#221b14]">
			<img
				src="/assets/flower1.png"
				alt=""
				className="pointer-events-none absolute select-none"
				style={{
					left: -380,
					bottom: -502.523,
					transform: "scale(0.5)",
				}}
			/>
			<img
				src="/assets/flower2.png"
				alt=""
				className="pointer-events-none absolute select-none"
				style={{
					right: -311,
					bottom: -794.523,
					transform: "scale(0.5)",
				}}
			/>
			<img
				src="/assets/flower3.png"
				alt=""
				className="pointer-events-none absolute select-none"
				style={{ right: -377, top: -287, transform: "scale(0.5)" }}
			/>
			<img
				src="/assets/flower4.png"
				alt=""
				className="pointer-events-none absolute select-none"
				style={{
					left: -397,
					top: -388,
					transform: "scale(0.5)",
				}}
			/>
			<div className="relative z-10 flex w-full flex-col items-start gap-25 self-stretch p-9">
				<section className="flex w-full flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
					<div className="flex flex-col items-start justify-center gap-8 self-stretch py-12">
						<div className="flex items-start justify-start gap-4">
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

						<div className="space-y-3">
							<h2 className="text-[32px] font-medium leading-tight tracking-[-0.03em] text-[#F80]">
								Welcome to SummerHacks!
							</h2>
							<p className="text-[32px] leading-tight tracking-[-0.03em] text-[#15110d]">
								SummerHacks will be hosted in Downtown Toronto.
								RSVP to join us under the sun.
							</p>
						</div>

						<div className="flex items-start justify-start gap-4">
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
							<h1 className="text-[31px] font-medium leading-none tracking-[-0.04em] text-[#15110d] sm:text-[33px]">
								SummerHacker RSVP
							</h1>
							<p className="max-w-152 text-[22px] leading-[1.08] tracking-[-0.03em] text-[#2f2a26] sm:text-[26px]">
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
							className="inline-flex h-14 items-center justify-center gap-2 self-start rounded-[100px] bg-[#F80] px-6 text-white transition-colors hover:bg-[#e67300] disabled:opacity-50"
						>
							{submitting ? "Submitting..." : "Submit"}
							<ArrowUp size={20} className="rotate-90" />
						</button>
					</form>
				</section>
			</div>
		</main>
	);
}
