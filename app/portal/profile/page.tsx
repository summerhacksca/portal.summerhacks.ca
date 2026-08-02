import Image from "next/image";
import { signOut } from "@/app/portal/actions";
import { CheckinDrawer } from "@/components/portal/CheckinDrawer";
import { initials } from "@/components/portal/navLinks";
import { ProfileForm } from "@/components/portal/ProfileForm";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { getCheckinQr } from "@/lib/portal/checkinQr";
import {
  getCheckinEvents,
  getMyCheckins,
  getProfile,
  getResumeSignedUrl,
  getTracks,
  isCheckedInAtRegistration,
} from "@/lib/portal/queries";

export default async function ProfilePage() {
  const [profile, allTracks, checkins, checkinEvents] = await Promise.all([
    getProfile(),
    getTracks(),
    getMyCheckins(),
    getCheckinEvents(),
  ]);

  if (!profile) {
    return (
      <main className="mx-auto flex w-full max-w-[1160px] flex-col gap-7 px-6 py-8 pb-20 sm:px-9">
        <p className="font-body text-[14px] text-sun-400">
          We couldn&apos;t load your profile. Try refreshing the page.
        </p>
      </main>
    );
  }

  const [checkinQr, resumeSignedUrl] = await Promise.all([
    getCheckinQr(profile.nfc_id),
    getResumeSignedUrl(profile.resume_path),
  ]);

  const programAndYear = [profile.program, profile.university_year].filter(Boolean).join(" · ");
  const resumeLink = resumeSignedUrl || profile.resume_url || null;

  return (
    <main className="mx-auto flex w-full max-w-[1160px] flex-col gap-7 px-6 py-8 pb-20 sm:px-9">
      <SectionHeader title="My profile" />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="flex items-center gap-5 rounded-sm bg-surface-card p-5 shadow-card sm:p-7">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name}
              width={88}
              height={88}
              className="h-16 w-16 flex-shrink-0 rounded-full object-cover sm:h-[88px] sm:w-[88px]"
            />
          ) : (
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-terracotta font-display text-xl font-semibold text-white sm:h-[88px] sm:w-[88px] sm:text-2xl">
              {initials(profile.full_name || profile.email)}
            </div>
          )}
          <div className="flex min-w-0 flex-col gap-1.5 break-words">
            <span className="font-display text-xl font-semibold tracking-tight text-base-800">
              {profile.full_name || "Add your name"}
            </span>
            <span className="font-body text-[13px] text-sun-400">
              {profile.team_name || "No team yet"}
            </span>
            <span className="font-body text-[13px] text-sun-400">
              Track: {profile.tracks.length ? profile.tracks.join(", ") : "Not selected yet"}
            </span>
            <span className="font-body text-[13px] text-sun-400">
              {profile.school || "No school listed"}
            </span>
            <span className="font-body text-[13px] text-sun-400">
              {programAndYear || "Program not listed"}
            </span>
            <span className="font-body text-[13px] text-sun-400">
              {resumeLink ? (
                <a href={resumeLink} target="_blank" rel="noreferrer" className="underline">
                  View resume
                </a>
              ) : (
                "No resume on file"
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2.5 rounded-sm bg-surface-card p-5 shadow-card sm:p-7">
          <CheckinDrawer
            checkedIn={isCheckedInAtRegistration(checkins, checkinEvents)}
            qrDataUrl={checkinQr.dataUrl}
            fullName={profile.full_name}
          />
          <p className="font-body text-[13px] leading-snug text-sun-400">
            A volunteer scans this at the registration desk and before meals. Your NFC tag opens
            the same page.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-sm bg-surface-card p-5 shadow-card sm:p-7">
        <span className="font-display text-sm font-medium tracking-tight text-sun-400">
          Edit your details
        </span>
        <ProfileForm
          fullName={profile.full_name}
          teamName={profile.team_name}
          school={profile.school}
          tracks={profile.tracks}
          allTracks={allTracks}
          universityYear={profile.university_year}
          program={profile.program}
          resumeUrl={profile.resume_url}
          resumePath={profile.resume_path}
          resumeSignedUrl={resumeSignedUrl}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-sm bg-surface-card p-5 shadow-card sm:p-7">
        <span className="font-display text-sm font-medium tracking-tight text-sun-400">
          Account
        </span>
        <p className="font-body text-[13px] text-sun-400">Signed in as {profile.email}</p>
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-pill bg-surface-pill px-6 font-display text-[13px] font-medium tracking-tight text-text-brand-accent transition-opacity hover:opacity-80"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
