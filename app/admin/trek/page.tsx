import { redirect } from "next/navigation";
import { TrekReviewList, type TrekReviewRow } from "@/components/admin/TrekReviewList";
import { TrekSettingsForm } from "@/components/admin/TrekSettingsForm";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { canManageStaff, getRoleFromAppMetadata } from "@/lib/auth/roles";
import {
  getPortalProfiles,
  getScavengerAdminTeams,
  getScavengerLocations,
  getScavengerSettings,
  getTrekPhotoUrls,
  getTrekReviewQueue,
} from "@/lib/portal/queries";
import { createClient } from "@/lib/supabase/server";

const TIME_ZONE = "America/Toronto";

/**
 * `<input type="datetime-local">` wants "2026-08-08T09:00" in the user's head,
 * which for this event is always Toronto wall-clock time — not the browser's
 * zone and not UTC. h23 rather than hour12:false, because some ICU builds
 * render midnight as "24" under the latter.
 */
function toDatetimeLocal(iso: string | undefined): string {
  if (!iso) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export default async function AdminTrekPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const viewerRole = user ? getRoleFromAppMetadata(user.app_metadata) : "user";

  if (!user || !canManageStaff(viewerRole)) {
    redirect("/admin");
  }

  const [settings, teams, locations, queue, profiles] = await Promise.all([
    getScavengerSettings(),
    getScavengerAdminTeams(),
    getScavengerLocations(true),
    getTrekReviewQueue(),
    getPortalProfiles(),
  ]);

  // Staff read the whole bucket via the "Staff can manage the trek bucket"
  // policy, so one batch call covers every team's photos.
  const photoUrls = await getTrekPhotoUrls(queue.map((row) => row.photo_path));

  const teamNames = new Map(teams.map((team) => [team.team_id, team.team_name]));
  const locationNames = new Map(locations.map((l) => [l.id, l.name]));
  const hackerNames = new Map(profiles.map((p) => [p.user_id, p.full_name]));

  const rows: TrekReviewRow[] = queue.map((row) => ({
    id: row.id,
    teamName: teamNames.get(row.team_id) ?? "Unknown team",
    locationName:
      (row.location_id ? locationNames.get(row.location_id) : row.custom_location) ??
      "Somewhere else",
    submittedByName: hackerNames.get(row.submitted_by) || "Unnamed hacker",
    photoUrl: photoUrls[row.photo_path] ?? null,
    status: row.status,
    reviewNote: row.review_note,
    createdAt: row.created_at,
  }));

  const pendingCount = queue.filter((row) => row.status === "pending").length;

  return (
    <main className="mx-auto flex w-full max-w-[1160px] flex-col gap-9 px-6 py-8 pb-20 sm:px-9">
      <SectionHeader
        title="The Third Space Trek"
        trailing={
          <span className="font-mono text-[11px] text-sun-400">
            {pendingCount} awaiting review
          </span>
        }
      />

      <section className="flex flex-col gap-5">
        <SectionHeader title="Settings" />
        <TrekSettingsForm
          settings={settings}
          startsLocal={toDatetimeLocal(settings?.starts_at)}
          endsLocal={toDatetimeLocal(settings?.ends_at)}
        />
      </section>

      <section className="flex flex-col gap-5">
        <SectionHeader
          title="Teams"
          trailing={
            <span className="font-mono text-[11px] text-sun-400">
              codes are here if a team loses theirs
            </span>
          }
        />
        {teams.length === 0 ? (
          <p className="font-body text-[14px] text-sun-400">
            No teams have been created yet.
          </p>
        ) : (
          <div className="flex flex-col gap-px overflow-hidden rounded-sm bg-black/[0.08]">
            {teams.map((team) => (
              <div
                key={team.team_id}
                className="flex flex-wrap items-center gap-4 bg-surface-card px-5 py-4"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-display text-[15px] font-medium tracking-tight text-base-800">
                    {team.team_name}
                  </span>
                  <span className="font-body text-[13px] text-sun-400">
                    {team.members.length > 0
                      ? team.members.join(", ")
                      : "No members"}
                  </span>
                  <span className="font-mono text-[11px] text-sun-400">
                    {team.team_slug}/ · {team.photo_count}{" "}
                    {team.photo_count === 1 ? "photo" : "photos"}
                  </span>
                </div>

                <span className="font-mono text-[15px] tracking-[0.2em] text-base-800">
                  {team.join_code}
                </span>

                <span className="w-10 text-right font-display text-lg font-medium tracking-tighter text-base-800">
                  {team.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-5">
        <SectionHeader
          title="Photo review"
          trailing={
            <span className="font-mono text-[11px] text-sun-400">
              rejecting removes the points
            </span>
          }
        />
        <TrekReviewList rows={rows} />
      </section>
    </main>
  );
}
