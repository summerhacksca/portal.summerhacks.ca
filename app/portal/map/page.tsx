import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { VenueMapView } from "@/components/portal/VenueMapView";
import { getMapZones } from "@/lib/portal/queries";

const PARK_DIRECTIONS = [
  "Exit Stackt Market onto Bathurst St and turn left (south), heading toward Wellington St W.",
  "Turn left onto Wellington St W and continue east for about 350 m.",
  "Turn right onto Niagara St, then take the first left onto Wellington St W's continuation toward Victoria Memorial Square.",
  "Victoria Memorial Square Park will be on your right. Enter through the main gate off Niagara St.",
  "Head to the open lawn in the center of the park, the designated meeting point.",
];

export default async function MapPage() {
  const zones = await getMapZones();

  return (
    <main className="mx-auto flex w-full max-w-290 flex-col gap-7 px-6 py-8 pb-20 sm:px-9">
      <p className="font-body text-[14px] text-sun-400">
        Stackt Market, 28 Bathurst St, Toronto - in-person day.
      </p>

      <VenueMapView />

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-sm bg-black/8 sm:grid-cols-2 lg:grid-cols-3">
        {zones.length === 0 ? (
          <p className="bg-surface-card p-5 font-body text-[14px] text-sun-400">
            Map details coming soon.
          </p>
        ) : (
          zones.map((zone) => (
            <div
              key={zone.id}
              className="flex items-start gap-3.5 bg-surface-card px-4.5 py-3.5"
            >
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: zone.color }}
              />
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-sm font-medium tracking-tight text-base-800">
                  {zone.name}
                </span>
                <span className="font-body text-xs text-sun-400">{zone.description}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <SectionHeader title="Directions to the park" />
      <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-2">
        <ol className="flex flex-col gap-4">
          {PARK_DIRECTIONS.map((step, index) => (
            <li key={index} className="flex items-start gap-3.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-sun-100 font-mono text-[11px] text-sun-400">
                {index + 1}
              </span>
              <span className="font-body text-[14px] text-base-800">{step}</span>
            </li>
          ))}
        </ol>

        {/* eslint-disable-next-line @next/next/no-img-element -- embedded-raster SVG, next/image cannot optimize it */}
        <img
          src="/assets/park.svg"
          alt="Walking route from Stackt Market to the park"
          width={1553}
          height={1341}
          className="h-auto w-full rounded-sm"
        />
      </div>
    </main>
  );
}
