import Link from "next/link";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { canManageStaff, getRoleFromAppMetadata } from "@/lib/auth/roles";
import { getCheckinEvents } from "@/lib/portal/queries";
import { createClient } from "@/lib/supabase/server";

const TIME_ZONE = "America/Toronto";

/**
 * The tool cards, as data rather than JSX for the same reason DOC_SECTIONS is
 * (lib/portal/docs.ts): the two groups below are derived from `organizerOnly`
 * rather than hand-maintained, so a card can never end up under the wrong
 * heading. Keep the flag in step with the organizer-only list in proxy.ts -
 * that is the actual gate, this only decides what a volunteer is shown.
 */
type StaffToolCard = {
  title: string;
  body: string;
  href: string;
  linkLabel: string;
  organizerOnly?: boolean;
};

const STAFF_TOOL_CARDS: StaffToolCard[] = [
  {
    title: "Checking hackers in",
    body: "Scan a hacker's QR code with your phone camera, or tap their NFC tag. Both open their check-in page directly - you don't need to come back here first. Pick the event, hit Check in, done.",
    href: "/admin/nfc-tags",
    linkLabel: "Provision NFC tags",
  },
  {
    title: "Walk-ins",
    body: "Someone turned up on the day without applying. Their email is all it takes: they get an account, the hacker role and an RSVP, and their check-in URL comes straight back so you can tag them and check them in on the spot.",
    href: "/admin/walk-ins",
    linkLabel: "Register a walk-in",
    organizerOnly: true,
  },
  {
    title: "The Third Space Trek",
    body: "Teams log an hourly photo of themselves working somewhere in the city. Photos score the moment they land, so review is a correction tool - rejecting one removes its points and hands the 2 point discovery bonus to that team's next photo at the same spot. Open, close and reschedule the hunt from the same page.",
    href: "/admin/trek",
    linkLabel: "Review trek photos",
    organizerOnly: true,
  },
  {
    title: "Staff",
    body: "Promote hackers to volunteer, and manage volunteer and organizer roles. Organizer rows are read-only unless you're a superadmin.",
    href: "/admin/staff",
    linkLabel: "Manage staff",
    organizerOnly: true,
  },
  {
    title: "Announcements",
    body: "Post to the portal home page's live announcements feed, with an option to mirror the post to Discord through the same webhook that pings upcoming events.",
    href: "/admin/announcements",
    linkLabel: "Post an announcement",
    organizerOnly: true,
  },
];

const SHARED_CARDS = STAFF_TOOL_CARDS.filter((card) => !card.organizerOnly);
const ORGANIZER_CARDS = STAFF_TOOL_CARDS.filter((card) => card.organizerOnly);

function ToolCardGrid({ cards }: Readonly<{ cards: StaffToolCard[] }>) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {cards.map((card) => (
        <section
          key={card.href}
          className="flex flex-col gap-4 rounded-sm bg-surface-card p-5 shadow-card sm:p-7"
        >
          <h2 className="font-display text-lg font-medium tracking-tight text-base-800">
            {card.title}
          </h2>
          <p className="font-body text-[14px] leading-relaxed text-base-800">{card.body}</p>
          <Link
            href={card.href}
            className="mt-auto font-display text-sm font-medium tracking-tight text-text-brand-accent hover:text-orange"
          >
            {card.linkLabel} →
          </Link>
        </section>
      ))}
    </div>
  );
}

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
      <section className="flex flex-col gap-5">
        <SectionHeader title="Everyone on staff" />
        <ToolCardGrid cards={SHARED_CARDS} />
      </section>

      {/* Heading and cards live or die together - a volunteer gets neither,
          rather than an "Organizers only" label sitting over nothing. */}
      {canSeeOrganizerLinks && (
        <section className="flex flex-col gap-5">
          <SectionHeader title="Organizers only" />
          <ToolCardGrid cards={ORGANIZER_CARDS} />
        </section>
      )}

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
