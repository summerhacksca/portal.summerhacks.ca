import { LogPhotoForm } from "@/components/portal/trek/LogPhotoForm";
import { SubmissionHistory } from "@/components/portal/trek/SubmissionHistory";
import { TeamCard } from "@/components/portal/trek/TeamCard";
import { TeamGate } from "@/components/portal/trek/TeamGate";
import { TrekLeaderboard } from "@/components/portal/trek/TrekLeaderboard";
import { TrekRulesDrawer } from "@/components/portal/trek/TrekRulesDrawer";
import { TrekStatusPill } from "@/components/portal/trek/TrekStatusPill";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import {
  getMyScavengerTeam,
  getScavengerLeaderboard,
  getScavengerLocations,
  getScavengerSettings,
  getTeamSubmissions,
  getTrekPhotoUrls,
} from "@/lib/portal/queries";
import {
  currentTrekState,
  TREK_SCORING,
  TREK_TAGLINE,
  type TrekStateInput,
} from "@/lib/portal/trek";
import type { ScoredSubmissionWithPhoto } from "@/lib/portal/types";

export default async function TrekPage() {
  const [settings, locations, team, leaderboard] = await Promise.all([
    getScavengerSettings(),
    getScavengerLocations(),
    getMyScavengerTeam(),
    getScavengerLeaderboard(),
  ]);

  // Only a team has photos, and only photos need signing.
  const submissions = team ? await getTeamSubmissions() : [];
  const photoUrls = await getTrekPhotoUrls(submissions.map((s) => s.photo_path));

  const scored: ScoredSubmissionWithPhoto[] = submissions.map((submission) => ({
    ...submission,
    photo_url: photoUrls[submission.photo_path] ?? null,
  }));

  const myRow = team
    ? (leaderboard.find((row) => row.team_id === team.team_id) ?? null)
    : null;

  const loggedLocationIds = submissions
    .filter((s) => s.status !== "rejected" && s.location_id)
    .map((s) => s.location_id as string);

  const stateInput: TrekStateInput = {
    isOpen: settings?.is_open ?? false,
    startsAt: settings?.starts_at ?? null,
    endsAt: settings?.ends_at ?? null,
    nextAllowedAt: team?.next_allowed_at ?? null,
  };

  // Computed once here and handed to the client components as their first
  // paint, so the countdowns hydrate without a mismatch.
  const initialState = currentTrekState(stateInput);

  const alreadyLogged = new Set(loggedLocationIds);

  return (
    <main className="mx-auto flex w-full max-w-[1160px] flex-col gap-7 px-6 py-8 pb-20 sm:px-9">
      <SectionHeader
        title="The Third Space Trek"
        trailing={
          <div className="flex flex-wrap items-center gap-2.5">
            <TrekStatusPill input={stateInput} initialState={initialState} />
            <TrekRulesDrawer />
          </div>
        }
      />

      <p className="max-w-[620px] font-body text-[14px] leading-relaxed text-sun-400">
        {TREK_TAGLINE} Work from somewhere in the city with your team, snap a
        photo once an hour, and rack up points.
      </p>

      {/* The two things a hacker checks mid-hunt are "what's this worth" and
          "when can I post again". Neither should cost a tap. */}
      <div className="grid gap-px overflow-hidden rounded-sm bg-black/[0.08] sm:grid-cols-2 lg:grid-cols-4">
        {TREK_SCORING.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-1.5 bg-surface-card p-5"
          >
            <span className="font-display text-lg font-medium tracking-tighter text-base-800">
              {row.points}
            </span>
            <span className="font-display text-[13px] font-medium tracking-tight text-base-800">
              {row.label}
            </span>
            <span className="font-body text-[13px] leading-snug text-sun-400">
              {row.detail}
            </span>
          </div>
        ))}
      </div>

      {team ? (
        <TeamCard
          team={team}
          points={myRow?.points ?? 0}
          spotsFound={myRow?.spots_found ?? 0}
          maxTeamSize={settings?.max_team_size ?? 4}
          canLeave={submissions.length === 0}
        />
      ) : (
        <TeamGate maxTeamSize={settings?.max_team_size ?? 4} />
      )}

      {team && (
        <LogPhotoForm
          locations={locations}
          stateInput={stateInput}
          initialState={initialState}
          loggedLocationIds={loggedLocationIds}
        />
      )}

      {team && (
        <section className="flex flex-col gap-5">
          <SectionHeader
            title="Your photos"
            trailing={
              <span className="font-mono text-[11px] text-sun-400">
                organizers review every photo
              </span>
            }
          />
          <SubmissionHistory submissions={scored} />
        </section>
      )}

      <section className="flex flex-col gap-5">
        <SectionHeader title="Leaderboard" />
        <TrekLeaderboard rows={leaderboard} myTeamId={team?.team_id ?? null} />
      </section>

      <section className="flex flex-col gap-5">
        <SectionHeader
          title="The list"
          trailing={
            <span className="font-mono text-[11px] text-sun-400">
              suggestions, not a to-do list
            </span>
          }
        />
        {locations.length === 0 ? (
          <p className="font-body text-[14px] text-sun-400">Spots coming soon.</p>
        ) : (
          <div className="flex flex-col gap-px overflow-hidden rounded-sm bg-black/[0.08]">
            {locations.map((location) => (
              <div
                key={location.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-surface-card px-5 py-4"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-display text-[15px] font-medium tracking-tight text-base-800">
                    {location.name}
                  </span>
                  <span className="font-body text-[13px] text-sun-400">
                    {location.area}
                    {location.notes && ` · ${location.notes}`}
                  </span>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="inline-flex items-center whitespace-nowrap rounded-pill bg-sun-100 px-2.5 py-1 font-display text-[11px] font-medium tracking-tight text-sun-400">
                    {location.tier}
                  </span>
                  {team && (
                    <span
                      className="inline-flex items-center whitespace-nowrap rounded-pill px-2.5 py-1 font-display text-[11px] font-medium tracking-tight"
                      style={{
                        background: alreadyLogged.has(location.id)
                          ? "rgba(143,194,0,0.14)"
                          : "var(--sun-100)",
                        color: alreadyLogged.has(location.id)
                          ? "var(--base-800)"
                          : "var(--sun-400)",
                      }}
                    >
                      {alreadyLogged.has(location.id) ? "Logged · 1 pt" : "New · 2 pts"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
