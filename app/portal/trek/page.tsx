import { MapPin, Trophy } from "lucide-react";
import { LogPhotoForm } from "@/components/portal/trek/LogPhotoForm";
import { StampCollection } from "@/components/portal/trek/StampCollection";
import { TeamCard } from "@/components/portal/trek/TeamCard";
import { TeamGate } from "@/components/portal/trek/TeamGate";
import { TrekLeaderboard } from "@/components/portal/trek/TrekLeaderboard";
import { TrekLocationList } from "@/components/portal/trek/TrekLocationList";
import { TrekPanel } from "@/components/portal/trek/TrekPanel";
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

  const myIndex = team
    ? leaderboard.findIndex((row) => row.team_id === team.team_id)
    : -1;
  const myRow = myIndex >= 0 ? leaderboard[myIndex] : null;

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

  return (
    <main className="mx-auto flex w-full max-w-[1160px] flex-col gap-7 px-6 py-8 pb-20 sm:px-9">
      {/* The leaderboard and the spot list both live behind a pill here, so the
          page itself stays down to the three things a hacker came to do: check
          the clock, log a photo, look at what they've collected. */}
      <SectionHeader
        title="The Third Space Trek"
        trailing={
          <div className="flex flex-wrap items-center gap-2.5">
            <TrekStatusPill input={stateInput} initialState={initialState} />
            <TrekRulesDrawer />
            <TrekPanel
              side="left"
              title="Leaderboard"
              label={myIndex >= 0 ? `Leaderboard · #${myIndex + 1}` : "Leaderboard"}
              icon={<Trophy size={14} aria-hidden />}
            >
              <TrekLeaderboard
                rows={leaderboard}
                myTeamId={team?.team_id ?? null}
              />
            </TrekPanel>
            <TrekPanel
              side="right"
              title="The list"
              label="The list"
              icon={<MapPin size={14} aria-hidden />}
            >
              <TrekLocationList
                locations={locations}
                loggedLocationIds={loggedLocationIds}
                showMarkers={Boolean(team)}
              />
            </TrekPanel>
          </div>
        }
      />

      <p className="max-w-[620px] font-body text-[14px] leading-relaxed text-sun-400">
        {TREK_TAGLINE} Work from somewhere in the city with your team, snap a
        photo once an hour, and rack up points.
      </p>

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
        <section className="flex flex-col gap-3">
          <SectionHeader
            title="Your collection"
            trailing={
              <span className="font-mono text-[11px] text-sun-400">
                organizers review every photo
              </span>
            }
          />
          <StampCollection submissions={scored} />
        </section>
      )}
    </main>
  );
}
