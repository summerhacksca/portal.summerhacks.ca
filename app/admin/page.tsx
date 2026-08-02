import Link from "next/link";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { canManageStaff, getRoleFromAppMetadata } from "@/lib/auth/roles";
import { getCheckinEvents } from "@/lib/portal/queries";
import { createClient } from "@/lib/supabase/server";

const TIME_ZONE = "America/Toronto";

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  });
}

export default async function AdminHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canSeeOrganizerLinks = user
    ? canManageStaff(getRoleFromAppMetadata(user.app_metadata))
    : false;

  const events = await getCheckinEvents();

  return (
    <main className="mx-auto flex w-full max-w-290 flex-col gap-9 px-6 py-8 pb-20 sm:px-9">
      <SectionHeader title="Staff tools" />

      <div className="grid gap-5 md:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-sm bg-surface-card p-7 shadow-card">
          <h2 className="font-display text-lg font-medium tracking-tight text-base-800">
            Checking hackers in
          </h2>
          <p className="font-body text-[14px] leading-relaxed text-base-800">
            Scan a hacker&apos;s QR code with your phone camera, or tap their NFC tag. Both open
            their check-in page directly - you don&apos;t need to come back here first. Pick the
            event, hit Check in, done.
          </p>
          <Link
            href="/admin/nfc-tags"
            className="font-display text-sm font-medium tracking-tight text-text-brand-accent hover:text-orange"
          >
            Provision NFC tags →
          </Link>
        </section>

        <section className="flex flex-col gap-4 rounded-sm bg-surface-card p-7 shadow-card">
          <h2 className="font-display text-lg font-medium tracking-tight text-base-800">
            The Third Space Trek
          </h2>
          <p className="font-body text-[14px] leading-relaxed text-base-800">
            Teams log an hourly photo of themselves working somewhere in the city. Photos score
            the moment they land, so review is a correction tool - rejecting one removes its
            points and hands the 2 point discovery bonus to that team&apos;s next photo at the
            same spot. Open, close and reschedule the hunt from the same page.
          </p>
          <Link
            href="/admin/trek"
            className="font-display text-sm font-medium tracking-tight text-text-brand-accent hover:text-orange"
          >
            Review trek photos →
          </Link>
        </section>

        {canSeeOrganizerLinks && (
          <>
            <section className="flex flex-col gap-4 rounded-sm bg-surface-card p-7 shadow-card">
              <h2 className="font-display text-lg font-medium tracking-tight text-base-800">
                Staff
              </h2>
              <p className="font-body text-[14px] leading-relaxed text-base-800">
                Promote hackers to volunteer, and manage volunteer and organizer roles. Organizer
                rows are read-only unless you&apos;re a superadmin.
              </p>
              <Link
                href="/admin/staff"
                className="font-display text-sm font-medium tracking-tight text-text-brand-accent hover:text-orange"
              >
                Manage staff →
              </Link>
            </section>

            <section className="flex flex-col gap-4 rounded-sm bg-surface-card p-7 shadow-card">
              <h2 className="font-display text-lg font-medium tracking-tight text-base-800">
                Announcements
              </h2>
              <p className="font-body text-[14px] leading-relaxed text-base-800">
                Post to the portal home page&apos;s live announcements feed, with an option to
                mirror the post to Discord through the same webhook that pings upcoming events.
              </p>
              <Link
                href="/admin/announcements"
                className="font-display text-sm font-medium tracking-tight text-text-brand-accent hover:text-orange"
              >
                Post an announcement →
              </Link>
            </section>
          </>
        )}
      </div>

      <section className="flex flex-col gap-5">
        <SectionHeader
          title="Events that need check-in"
          trailing={
            <span className="font-mono text-[11px] text-sun-400">
              meals and registration only
            </span>
          }
        />
        {events.length === 0 ? (
          <p className="font-body text-[14px] text-sun-400">
            No events are set up for check-in yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-sm bg-surface-card shadow-card">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-black/6 px-6 py-4 first:border-t-0"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-display text-[15px] font-medium tracking-tight text-base-800">
                    {event.title}
                  </span>
                  <span className="font-body text-[13px] text-sun-400">{event.location}</span>
                </div>
                <span className="font-mono text-[12px] text-base-800">
                  {formatEventTime(event.starts_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
