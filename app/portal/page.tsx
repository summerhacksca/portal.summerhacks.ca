import Link from "next/link";
import { CheckinDrawer } from "@/components/portal/CheckinDrawer";
import { AppleGlyph, OrangeGlyph } from "@/components/portal/ui/icons";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { getCheckinQr } from "@/lib/portal/checkinQr";
import {
  getAnnouncements,
  getMyCheckins,
  getProfile,
  getSchedule,
  isCheckedInAtRegistration,
} from "@/lib/portal/queries";
import { pickUpNext } from "@/lib/portal/schedule";

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Toronto",
  });
}

export default async function PortalHomePage() {
  const [profile, announcements, schedule, checkins] = await Promise.all([
    getProfile(),
    getAnnouncements(),
    getSchedule(),
    getMyCheckins(),
  ]);

  const upNext = pickUpNext(schedule);
  const checkinQr = profile ? await getCheckinQr(profile.nfc_id) : null;

  const trackLine = profile?.tracks?.length ? profile.tracks.join(", ") : "Not selected yet";

  return (
    <main className="mx-auto flex w-full max-w-[1160px] flex-col gap-9 px-9 py-8 pb-20">
      {/* Hero */}
      <section
        className="relative flex min-h-[220px] items-center overflow-hidden rounded-sm"
        style={{
          background:
            "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.6), transparent 40%), radial-gradient(circle at 85% 75%, rgba(255,255,255,0.5), transparent 45%), linear-gradient(135deg, var(--sky-100), var(--sun-100))",
        }}
      >
        <OrangeGlyph
          size={34}
          className="absolute right-7 top-4"
          style={{ transform: "rotate(-8deg)" }}
        />
        <AppleGlyph
          size={26}
          color="var(--terracotta)"
          className="absolute bottom-4 right-[70px]"
          style={{ transform: "rotate(10deg)" }}
        />
        <AppleGlyph
          size={24}
          color="var(--sun-300)"
          className="absolute left-6 top-6"
          style={{ transform: "rotate(-15deg)" }}
        />

        <div className="flex w-full flex-wrap items-center justify-between gap-6 p-8">
          <div className="flex flex-col gap-2">
            <span className="font-display text-sm font-medium tracking-tight text-sun-400">
              Orange you glad you&apos;re back?
            </span>
            <h1 className="font-display text-4xl font-medium tracking-tight text-base-800">
              {profile?.full_name || "Hacker"}
            </h1>
            <span className="font-body text-sm text-base-800">
              {profile?.team_name || "No team yet"} · Track: {trackLine}
            </span>
          </div>

          {profile && checkinQr && (
            <div className="flex items-center gap-4 rounded-sm bg-white py-2.5 pl-5 pr-2.5 shadow-pop">
              <CheckinDrawer
                checkedIn={isCheckedInAtRegistration(checkins, schedule)}
                qrDataUrl={checkinQr.dataUrl}
                fullName={profile.full_name}
              />
            </div>
          )}
        </div>
      </section>

      {/* Live announcements */}
      <section className="flex flex-col gap-5">
        <SectionHeader
          number="1"
          icon={<OrangeGlyph />}
          title="Live announcements"
          trailing={
            <span className="font-mono text-[11px] text-sun-400">
              synced from #announcements
            </span>
          }
        />
        {announcements.length === 0 ? (
          <p className="font-body text-[14px] text-sun-400">No announcements yet.</p>
        ) : (
          <div className="flex flex-col gap-px overflow-hidden rounded-sm bg-black/[0.08]">
            {announcements.map((note) => (
              <div
                key={note.id}
                className="flex gap-4 px-5 py-4.5"
                style={{
                  background:
                    note.accent === "var(--orange)" ? "var(--sun-50)" : "var(--base-0)",
                  borderLeft: `3px solid ${note.accent}`,
                }}
              >
                <div className="flex w-[120px] flex-shrink-0 flex-col gap-0.5">
                  <span className="font-mono text-[11px] text-sun-400">
                    {relativeTime(note.created_at)}
                  </span>
                  <span className="font-display text-[12px] font-semibold text-base-800">
                    #{note.channel}
                  </span>
                </div>
                <p className="font-body text-[14px] leading-relaxed text-base-800">
                  {note.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Up next */}
      <section className="flex flex-col gap-5">
        <SectionHeader number="2" icon={<AppleGlyph />} title="Up next" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {upNext.map((ev) => (
            <div
              key={ev.id}
              className="flex flex-col gap-2 rounded-sm bg-surface-card p-5 shadow-card"
            >
              <span className="font-mono text-xs text-sun-400">
                {formatEventTime(ev.starts_at)}
              </span>
              <span className="font-display text-lg font-medium tracking-tight text-base-800">
                {ev.title}
              </span>
              <span className="font-body text-[13px] text-sun-400">{ev.location}</span>
            </div>
          ))}
        </div>
        <Link
          href="/portal/schedule"
          className="font-display text-sm font-medium tracking-tight text-text-brand-accent hover:text-orange"
        >
          View full schedule →
        </Link>
      </section>
    </main>
  );
}
