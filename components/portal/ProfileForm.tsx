"use client";

import { FileText, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { startResumeUpload, updateProfile } from "@/app/portal/actions";
import { MAX_RESUME_BYTES, RESUME_BUCKET, RESUME_CONTENT_TYPE } from "@/lib/portal/resume";
import { UNIVERSITY_YEARS, type Track } from "@/lib/portal/types";
import { createClient } from "@/lib/supabase/client";

const inputClass =
	"h-11 w-full rounded-sm border border-black/10 bg-sun-50 px-4 text-[14px] text-base-800 outline-none transition focus:border-sun-300 focus:bg-white";

export function ProfileForm({
	fullName,
	teamName,
	school,
	tracks,
	allTracks,
	universityYear,
	program,
	resumeUrl,
	resumePath,
	resumeSignedUrl,
}: {
	fullName: string;
	teamName: string;
	school: string;
	tracks: string[];
	allTracks: Track[];
	universityYear: string;
	program: string;
	resumeUrl: string;
	resumePath: string;
	resumeSignedUrl: string | null;
}) {
	const [isPending, startTransition] = useTransition();
	const [selectedTracks, setSelectedTracks] = useState<string[]>(tracks);
	const [currentResumePath, setCurrentResumePath] = useState(resumePath);
	const [currentResumeUrl, setCurrentResumeUrl] = useState(resumeSignedUrl);
	const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const fileRef = useRef<HTMLInputElement>(null);

	function toggleTrack(name: string) {
		setSelectedTracks((prev) =>
			prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
		);
	}

	function handleResumeFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		setSelectedFileName(e.target.files?.[0]?.name ?? null);
	}

	function handleRemoveResume() {
		setCurrentResumePath("");
		setCurrentResumeUrl(null);
		setSelectedFileName(null);
		if (fileRef.current) fileRef.current.value = "";
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setMessage("");
		setError("");

		const formData = new FormData(e.currentTarget);
		formData.delete("tracks");
		selectedTracks.forEach((t) => formData.append("tracks", t));

		const file = fileRef.current?.files?.[0];

		if (file && file.type !== RESUME_CONTENT_TYPE) {
			setError("Resumes must be a PDF.");
			return;
		}

		if (file && file.size > MAX_RESUME_BYTES) {
			setError("That resume is too large. Try again with a smaller file.");
			return;
		}

		startTransition(async () => {
			try {
				let resumePathToSave = currentResumePath;

				if (file) {
					const ticket = await startResumeUpload();
					const supabase = createClient();
					const { error: uploadError } = await supabase.storage
						.from(RESUME_BUCKET)
						.uploadToSignedUrl(ticket.path, ticket.token, file, {
							contentType: RESUME_CONTENT_TYPE,
						});

					if (uploadError) {
						console.error("Resume upload failed:", uploadError);
						setError("The upload didn't go through. Check your signal and try again.");
						return;
					}

					resumePathToSave = ticket.path;
				}

				formData.set("resume_path", resumePathToSave);

				await updateProfile(formData);
				setCurrentResumePath(resumePathToSave);
				// Clear the raw <input> so a second "Save" without touching the
				// resume field can't silently re-upload the same file; the name
				// stays in selectedFileName so the confirmation text is unaffected.
				if (fileRef.current) fileRef.current.value = "";
				setMessage("Profile updated.");
			} catch (err) {
				setError((err as Error).message);
			}
		});
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5">
			<label className="flex flex-col gap-2">
				<span className="font-body text-[13px] text-sun-400">Full name</span>
				<input
					name="full_name"
					defaultValue={fullName}
					placeholder="Jordan Alvarez"
					className={inputClass}
				/>
			</label>

			<label className="flex flex-col gap-2">
				<span className="font-body text-[13px] text-sun-400">Team name</span>
				<input
					name="team_name"
					defaultValue={teamName}
					placeholder="Team Fern & Ash"
					className={inputClass}
				/>
			</label>

			<label className="flex flex-col gap-2">
				<span className="font-body text-[13px] text-sun-400">School</span>
				<input
					name="school"
					defaultValue={school}
					placeholder="University of Toronto"
					className={inputClass}
				/>
			</label>

			<label className="flex flex-col gap-2">
				<span className="font-body text-[13px] text-sun-400">Program</span>
				<input
					name="program"
					defaultValue={program}
					placeholder="Computer Engineering"
					className={inputClass}
				/>
			</label>

			<label className="flex flex-col gap-2">
				<span className="font-body text-[13px] text-sun-400">Year</span>
				<select name="university_year" defaultValue={universityYear} className={inputClass}>
					<option value="">Select…</option>
					{UNIVERSITY_YEARS.map((year) => (
						<option key={year} value={year}>
							{year}
						</option>
					))}
				</select>
			</label>

			<div className="flex flex-col gap-2">
				<span className="font-body text-[13px] text-sun-400">Resume</span>

				<label
					htmlFor="resume-file"
					className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-sm border-2 border-dashed px-4 py-6 text-center transition ${
						selectedFileName || currentResumePath
							? "border-sun-300 bg-sun-50"
							: "border-black/15 bg-sun-50 hover:border-sun-300 hover:bg-white"
					}`}
				>
					<input
						ref={fileRef}
						id="resume-file"
						type="file"
						accept="application/pdf"
						onChange={handleResumeFileChange}
						className="sr-only"
					/>
					{selectedFileName ? (
						<>
							<FileText className="h-5 w-5 text-sun-400" strokeWidth={1.5} />
							<span className="font-body text-[14px] text-base-800">{selectedFileName}</span>
							<span className="font-body text-[12px] text-sun-400">
								Click to choose a different file
							</span>
						</>
					) : currentResumePath ? (
						<>
							<FileText className="h-5 w-5 text-sun-400" strokeWidth={1.5} />
							<span className="font-body text-[14px] text-base-800">Resume on file</span>
							<span className="font-body text-[12px] text-sun-400">Click to replace</span>
						</>
					) : (
						<>
							<Upload className="h-5 w-5 text-sun-400" strokeWidth={1.5} />
							<span className="font-body text-[14px] text-base-800">
								Click to upload your resume
							</span>
							<span className="font-body text-[12px] text-sun-400">PDF, up to 5MB</span>
						</>
					)}
				</label>

				{(currentResumeUrl || selectedFileName || currentResumePath) && (
					<div className="flex flex-wrap items-center gap-4">
						{currentResumeUrl && !selectedFileName && (
							<a
								href={currentResumeUrl}
								target="_blank"
								rel="noreferrer"
								className="font-body text-[13px] text-text-brand-accent underline"
							>
								View current resume
							</a>
						)}
						<button
							type="button"
							onClick={handleRemoveResume}
							className="font-body text-[13px] text-sun-400 underline"
						>
							Remove
						</button>
					</div>
				)}

				<label className="flex flex-col gap-2">
					<span className="font-body text-[13px] text-sun-400">…or paste a link</span>
					<input
						name="resume_url"
						type="url"
						defaultValue={resumeUrl}
						placeholder="https://drive.google.com/..."
						className={inputClass}
					/>
				</label>
			</div>

			<div className="flex flex-col gap-2">
				<span className="font-body text-[13px] text-sun-400">
					Track selection
				</span>
				<div className="flex flex-wrap gap-2">
					{allTracks.map((track) => {
						const selected = selectedTracks.includes(track.name);
						return (
							<button
								key={track.slug}
								type="button"
								onClick={() => toggleTrack(track.name)}
								className={`rounded-pill px-4 py-2 font-display text-[13px] font-medium tracking-tight transition-colors ${
									selected
										? "bg-base-900 text-base-0"
										: "bg-sun-100 text-base-800 hover:bg-sun-100/70"
								}`}
							>
								{track.name}
							</button>
						);
					})}
				</div>
			</div>

			{error && <p className="font-body text-[13px] text-red-500">{error}</p>}
			{message && (
				<p className="font-body text-[13px] text-green-600">{message}</p>
			)}

			<button
				type="submit"
				disabled={isPending}
				className="inline-flex h-11 w-fit items-center justify-center rounded-pill bg-base-900 px-6 font-display text-[13px] font-medium tracking-tight text-base-0 transition-opacity hover:opacity-80 disabled:opacity-50"
			>
				{isPending ? "Saving…" : "Save changes"}
			</button>
		</form>
	);
}
