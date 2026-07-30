import Image from "next/image";
import { signOut } from "@/app/portal/actions";
import { CheckinDrawer } from "@/components/portal/CheckinDrawer";
import { ProfileForm } from "@/components/portal/ProfileForm";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { getCheckinQr } from "@/lib/portal/checkinQr";
import {
  getCheckinEvents,
  getMyCheckins,
  getProfile,
  getTracks,
  isCheckedInAtRegistration,
} from "@/lib/portal/queries";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function ProfilePage() {
  const [profile, allTracks, checkins, checkinEvents] = await Promise.all([
    getProfile(),
    getTracks(),
    getMyCheckins(),
    getCheckinEvents(),
  ]);

  if (!profile) {
    return (
      <main className="mx-auto flex w-full max-w-[1160px] flex-col gap-7 px-9 py-8 pb-20">
        <p className="font-body text-[14px] text-sun-400">
          We couldn&apos;t load your profile. Try refreshing the page.
        </p>
      </main>
    );
  }

  const checkinQr = await getCheckinQr(profile.nfc_id);

  return (
    <main className="mx-auto flex w-full max-w-[1160px] flex-col gap-7 px-9 py-8 pb-20">
      <SectionHeader title="My profile" />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="flex items-center gap-5 rounded-sm bg-surface-card p-7 shadow-card">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name}
              width={88}
              height={88}
              className="h-[88px] w-[88px] flex-shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-[88px] w-[88px] flex-shrink-0 items-center justify-center rounded-full bg-terracotta font-display text-2xl font-semibold text-white">
              {initials(profile.full_name || profile.email)}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
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
          </div>
        </div>

        <div className="flex flex-col items-start gap-2.5 rounded-sm bg-surface-card p-7 shadow-card">
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

      <div className="flex flex-col gap-5 rounded-sm bg-surface-card p-7 shadow-card">
        <span className="font-display text-sm font-medium tracking-tight text-sun-400">
          Edit your details
        </span>
        <ProfileForm
          fullName={profile.full_name}
          teamName={profile.team_name}
          school={profile.school}
          tracks={profile.tracks}
          allTracks={allTracks}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-sm bg-surface-card p-7 shadow-card">
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
