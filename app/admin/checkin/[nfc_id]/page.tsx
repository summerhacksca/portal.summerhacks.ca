import Link from "next/link";
import { CheckinPanel } from "@/components/admin/CheckinPanel";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { currentActiveCheckinEvents } from "@/lib/portal/checkinWindow";
import { getCheckinEvents, getCheckinsForUser, getProfileByNfcId } from "@/lib/portal/queries";
import { checkInUrlFor } from "@/lib/portal/siteUrl";

export default async function AdminCheckinPage({
  params,
}: {
  params: Promise<{ nfc_id: string }>;
}) {
  const { nfc_id: nfcId } = await params;

  const [profile, events] = await Promise.all([getProfileByNfcId(nfcId), getCheckinEvents()]);

  if (!profile) {
    return (
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-5 px-6 py-8 sm:px-9">
        <SectionHeader title="Check-in" />
        <div className="flex flex-col gap-3 rounded-sm bg-surface-card p-7 shadow-card">
          <span className="font-display text-lg font-medium tracking-tight text-base-800">
            No hacker found for this tag
          </span>
          <p className="font-body text-[14px] leading-relaxed text-sun-400">
            Nothing in the portal matches{" "}
            <span className="font-mono text-[13px] text-base-800">{nfcId}</span>. The tag may
            have been written with an old or mistyped URL - check it against the provisioning
            page.
          </p>
          <Link
            href="/admin/nfc-tags"
            className="font-display text-sm font-medium tracking-tight text-text-brand-accent hover:text-orange"
          >
            Open NFC tags →
          </Link>
        </div>
      </main>
    );
  }

  // Server component, so the hacker's details are here on first paint - no
  // client-side polling needed before a volunteer can act.
  const checkins = await getCheckinsForUser(profile.user_id);

  // Narrow the dropdown to whatever's actually running (or about to start).
  // Falls back to the full list when nothing qualifies, same as before this
  // existed - a volunteer handling a late/early arrival can still pick.
  const active = currentActiveCheckinEvents(events);
  const candidates = active.length > 0 ? active : events;

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col gap-5 px-6 py-8 pb-20 sm:px-9">
      <SectionHeader title="Check-in" />
      <CheckinPanel
        nfcId={nfcId}
        checkInUrl={checkInUrlFor(nfcId)}
        profile={{
          fullName: profile.full_name,
          email: profile.email,
          teamName: profile.team_name,
          school: profile.school,
          tracks: profile.tracks,
        }}
        events={candidates.map((event) => ({
          id: event.id,
          title: event.title,
          startsAt: event.starts_at,
        }))}
        defaultEventId={candidates[0]?.id ?? ""}
        autoCheckInEventId={active.length === 1 ? active[0].id : null}
        noActiveEvent={active.length === 0}
        checkedInEventIds={checkins.filter((c) => c.checked_in).map((c) => c.event_id)}
      />
    </main>
  );
}
