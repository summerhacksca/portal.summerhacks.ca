"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { recordTrekSubmission, startPhotoUpload } from "@/app/portal/trek/actions";
import { preparePhoto } from "@/lib/portal/photo";
import {
	CUSTOM_LOCATION_VALUE,
	TREK_BUCKET,
	trekState,
	type TrekState,
	type TrekStateInput,
} from "@/lib/portal/trek";
import type { ScavengerLocation } from "@/lib/portal/types";
import { useNow } from "@/lib/portal/useNow";
import { createClient } from "@/lib/supabase/client";

/** Matches file_size_limit on the scavenger-hunt bucket (migrations/0009). */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const inputClass =
	"h-11 w-full rounded-sm border border-black/10 bg-sun-50 px-4 text-[14px] text-base-800 outline-none transition focus:border-sun-300 focus:bg-white";

/**
 * Log one photo. The file goes browser -> Storage directly, using a ticket the
 * server mints, so it never round-trips through a function on a cafe
 * connection:
 *
 *   1. shrink the photo on-device (also fixes rotation, drops GPS EXIF)
 *   2. startPhotoUpload() -> signed upload ticket into this team's folder
 *   3. uploadToSignedUrl() straight to Supabase
 *   4. recordTrekSubmission() writes the row
 *
 * If the tab dies between 3 and 4 the object is simply unreferenced; nothing
 * reads or scores it, and 0009's operational notes have the cleanup query.
 */
export function LogPhotoForm({
	locations,
	stateInput,
	initialState,
	loggedLocationIds,
}: {
	locations: ScavengerLocation[];
	stateInput: TrekStateInput;
	initialState: TrekState;
	loggedLocationIds: string[];
}) {
	const [isPending, startTransition] = useTransition();
	const [locationValue, setLocationValue] = useState("");
	const [customName, setCustomName] = useState("");
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const fileRef = useRef<HTMLInputElement>(null);

	const nowMs = useNow();
	const state = nowMs === 0 ? initialState : trekState(stateInput, nowMs);
	const isCustom = locationValue === CUSTOM_LOCATION_VALUE;
	const alreadyLogged = new Set(loggedLocationIds);

	// Object URLs are leaked memory until revoked.
	useEffect(() => {
		if (!previewUrl) return;
		return () => URL.revokeObjectURL(previewUrl);
	}, [previewUrl]);

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		setPreviewUrl(file ? URL.createObjectURL(file) : null);
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setMessage("");
		setError("");

		const file = fileRef.current?.files?.[0];

		if (!locationValue) {
			setError("Pick which spot you worked from.");
			return;
		}

		if (isCustom && !customName.trim()) {
			setError("Type the name of the spot you worked from.");
			return;
		}

		if (!file) {
			setError("Add a photo of your whole team at the spot.");
			return;
		}

		startTransition(async () => {
			try {
				const photo = await preparePhoto(file);

				if (photo.blob.size > MAX_UPLOAD_BYTES) {
					setError("That photo is too large. Try again with a smaller one.");
					return;
				}

				const ticket = await startPhotoUpload(photo.extension);

				const supabase = createClient();
				const { error: uploadError } = await supabase.storage
					.from(TREK_BUCKET)
					.uploadToSignedUrl(ticket.path, ticket.token, photo.blob, {
						contentType: photo.contentType,
					});

				if (uploadError) {
					console.error("Trek photo upload failed:", uploadError);
					setError("The upload didn't go through. Check your signal and try again.");
					return;
				}

				await recordTrekSubmission({
					path: ticket.path,
					locationId: isCustom ? null : locationValue,
					customLocation: isCustom ? customName : "",
				});

				setMessage("Logged. Nice one.");
				setLocationValue("");
				setCustomName("");
				setPreviewUrl(null);
				if (fileRef.current) fileRef.current.value = "";
			} catch (err) {
				setError((err as Error).message);
			}
		});
	}

	if (!state.canSubmit) {
		return (
			<div className="flex flex-col gap-2 rounded-sm bg-surface-card p-5 shadow-card sm:p-7">
				<h2 className="font-display text-lg font-medium tracking-tight text-base-800">
					Log a photo
				</h2>
				<p className="max-w-[620px] font-body text-[14px] leading-relaxed text-sun-400">
					{state.detail}
				</p>
			</div>
		);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-5 rounded-sm bg-surface-card p-5 shadow-card sm:p-7"
		>
			<div className="flex flex-col gap-1.5">
				<h2 className="font-display text-lg font-medium tracking-tight text-base-800">
					Log a photo
				</h2>
				<p className="max-w-[620px] font-body text-[14px] leading-relaxed text-sun-400">
					Everyone on the team in frame, lanyards visible. One photo per hour,
					per team - so make it count.
				</p>
			</div>

			<div className="flex flex-col gap-2">
				<label
					htmlFor="trek_location"
					className="font-display text-[13px] font-semibold tracking-tight text-base-800"
				>
					Where did you work from?
				</label>
				<select
					id="trek_location"
					value={locationValue}
					onChange={(event) => setLocationValue(event.target.value)}
					className={inputClass}
				>
					<option value="">Pick a spot…</option>
					{locations.map((location) => (
						<option key={location.id} value={location.id}>
							{location.name}
							{alreadyLogged.has(location.id) ? " (logged - 1 pt)" : " (new - 2 pts)"}
						</option>
					))}
					<option value={CUSTOM_LOCATION_VALUE}>
						Somewhere else (1 pt)
					</option>
				</select>
			</div>

			{isCustom && (
				<div className="flex flex-col gap-2">
					<label
						htmlFor="trek_custom_location"
						className="font-display text-[13px] font-semibold tracking-tight text-base-800"
					>
						What&apos;s it called?
					</label>
					<input
						id="trek_custom_location"
						type="text"
						value={customName}
						onChange={(event) => setCustomName(event.target.value)}
						maxLength={80}
						placeholder="The name of the space"
						autoComplete="off"
						className={inputClass}
					/>
					<p className="font-body text-[13px] text-sun-400">
						Off-list spots are worth 1 point - the 2 point bonus is only for
						spots on the list.
					</p>
				</div>
			)}

			<div className="flex flex-col gap-2">
				<label
					htmlFor="trek_photo"
					className="font-display text-[13px] font-semibold tracking-tight text-base-800"
				>
					Team photo
				</label>
				<input
					id="trek_photo"
					ref={fileRef}
					type="file"
					accept="image/*"
					capture="environment"
					onChange={handleFileChange}
					className="w-full font-body text-[14px] text-base-800 file:mr-4 file:h-11 file:cursor-pointer file:rounded-pill file:border-0 file:bg-surface-pill file:px-5 file:font-display file:text-[13px] file:font-medium file:tracking-tight file:text-text-brand-accent"
				/>
			</div>

			{previewUrl && (
				<div className="overflow-hidden rounded-sm bg-sun-100">
					{/* eslint-disable-next-line @next/next/no-img-element -- object: URL, next/image can't optimize it */}
					<img
						src={previewUrl}
						alt="Your team photo, ready to log"
						className="max-h-64 w-full object-cover"
					/>
				</div>
			)}

			{error && <p className="font-body text-[13px] text-red-500">{error}</p>}
			{message && <p className="font-body text-[13px] text-green-600">{message}</p>}

			<button
				type="submit"
				disabled={isPending}
				className="inline-flex h-11 w-fit items-center justify-center rounded-pill bg-base-900 px-6 font-display text-[13px] font-medium tracking-tight text-base-0 transition-opacity hover:opacity-80 disabled:opacity-50"
			>
				{isPending ? "Uploading…" : "Log this photo"}
			</button>
		</form>
	);
}
