/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";

export default function RSVPLoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		setMessage("");

		try {
			const res = await fetch("/api/auth/send-magic-link", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error ?? "Failed to send magic link");
			}

			setMessage("Magic link sent! Check your email.");
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#fffaf2] p-3 text-[#221b14]">
			<div className="flex w-full max-w-md flex-col items-center gap-6 rounded-[28px] bg-white p-8 shadow-sm">
				<h1 className="text-[28px] font-medium tracking-[-0.04em] text-[#15110d]">
					Sign in to RSVP
				</h1>
				<p className="text-center text-[15px] leading-snug text-[#2f2a26]">
					Enter your email and we'll send you a magic link to sign in.
				</p>

				<form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
					<input
						type="email"
						value={email}
						onChange={(e) => {
							setEmail(e.target.value);
							if (error) setError("");
						}}
						placeholder="your@email.com"
						required
						className="h-12 w-full rounded-sm border border-[#f0d8bc] bg-[#fae9d4] px-4 text-[14px] text-[#2f2418] outline-none transition focus:border-[#e7b56c] focus:bg-[#f8e0bf]"
					/>

					{error && (
						<p className="text-[13px] text-red-500">{error}</p>
					)}
					{message && (
						<p className="text-[13px] text-green-600">{message}</p>
					)}

					<button
						type="submit"
						disabled={loading}
						className="inline-flex h-14 items-center justify-center gap-2 self-end rounded-[100px] bg-[#F80] px-6 text-white transition-colors hover:bg-[#e67300] disabled:opacity-50"
					>
						{loading ? "Sending..." : "Send magic link"}
						<ArrowUp size={20} className="rotate-90" />
					</button>
				</form>
			</div>
		</main>
	);
}
