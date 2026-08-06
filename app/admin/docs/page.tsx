import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { canManageStaff, getRoleFromAppMetadata } from "@/lib/auth/roles";
import { DOC_SECTIONS, type DocBlock, type DocSection } from "@/lib/portal/docs";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Staff guide · SummerHacks",
  description: "How the portal works, and what to do when it doesn't",
};

/**
 * The staff guide. Content lives in lib/portal/docs.ts; this file only renders
 * it, so the table of contents can be derived from the same list rather than
 * kept in step by hand.
 *
 * Volunteers reach this page - proxy.ts only gates /admin/trek, /admin/staff
 * and /admin/announcements behind canManageStaff, and this route is
 * deliberately not one of them. Organizer-only sections are filtered out per
 * section below instead, which is also what keeps environment variable names
 * off a volunteer's screen.
 *
 * No client component: the contents list is plain anchors and the
 * troubleshooting entries are <details>, so all of it works server-rendered.
 */

function Block({ block }: { block: DocBlock }) {
  switch (block.kind) {
    case "heading":
      return (
        <h3 className="mt-2 font-display text-[15px] font-semibold tracking-tight text-base-800">
          {block.text}
        </h3>
      );

    case "prose":
      return (
        <p className="max-w-155 font-body text-[14px] leading-relaxed text-base-800">
          {block.text}
        </p>
      );

    case "steps":
      return (
        <ol className="flex max-w-155 flex-col gap-3">
          {block.items.map((item, index) => (
            <li key={item} className="flex items-start gap-3.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-sun-100 font-mono text-[11px] text-sun-400">
                {index + 1}
              </span>
              <span className="font-body text-[14px] leading-relaxed text-base-800">{item}</span>
            </li>
          ))}
        </ol>
      );

    case "list":
      return (
        <ul className="flex max-w-155 flex-col gap-2.5">
          {block.items.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sun-300"
              />
              <span className="font-body text-[14px] leading-relaxed text-base-800">{item}</span>
            </li>
          ))}
        </ul>
      );

    case "note":
      return (
        <p
          className="max-w-155 rounded-sm px-4 py-3 font-body text-[13px] leading-relaxed text-base-800"
          style={{ background: "var(--sun-50)", borderLeft: "3px solid var(--orange)" }}
        >
          {block.text}
        </p>
      );

    case "table":
      // Its own scroll container - a wide table must never make the page
      // scroll sideways on a phone.
      return (
        <div className="max-w-155 overflow-x-auto rounded-sm bg-surface-card shadow-card">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {block.head.map((cell) => (
                  <th
                    key={cell}
                    scope="col"
                    className="whitespace-nowrap border-b border-black/8 px-4 py-3 font-display text-[12px] font-semibold tracking-tight text-sun-400"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]}>
                  <td className="border-t border-black/6 px-4 py-3 align-top font-mono text-[12px] text-base-800">
                    {row[0]}
                  </td>
                  {row.slice(1).map((cell) => (
                    <td
                      key={cell}
                      className="border-t border-black/6 px-4 py-3 align-top font-body text-[13px] leading-relaxed text-base-800"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "faq":
      return (
        <div className="flex max-w-155 flex-col gap-px overflow-hidden rounded-sm bg-black/[0.08]">
          {block.items.map((item) => (
            <details key={item.symptom} className="group bg-surface-card">
              <summary className="cursor-pointer list-none px-5 py-4 font-display text-[14px] font-medium tracking-tight text-base-800 transition-opacity hover:opacity-70">
                <span className="mr-2 font-mono text-[12px] text-sun-400 group-open:hidden">
                  +
                </span>
                <span className="mr-2 hidden font-mono text-[12px] text-sun-400 group-open:inline">
                  −
                </span>
                {item.symptom}
              </summary>
              {/* pl matches the summary's marker gutter so the answer lines up
                  under the question, not under the +/− glyph. */}
              <div className="flex flex-col gap-3 pr-5 pb-4.5 pl-[2.4rem]">
                <div className="flex flex-col gap-1">
                  <span className="font-display text-[12px] font-semibold tracking-tight text-sun-400">
                    Why
                  </span>
                  <span className="font-body text-[13.5px] leading-relaxed text-base-800">
                    {item.cause}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-display text-[12px] font-semibold tracking-tight text-sun-400">
                    Do this
                  </span>
                  <span className="font-body text-[13.5px] leading-relaxed text-base-800">
                    {item.fix}
                  </span>
                </div>
              </div>
            </details>
          ))}
        </div>
      );
  }
}

function Section({ section, index }: { section: DocSection; index: number }) {
  return (
    <section id={section.id} className="flex scroll-mt-28 flex-col gap-5">
      <SectionHeader
        number={String(index + 1)}
        title={section.title}
        trailing={
          section.organizerOnly ? (
            <span className="font-mono text-[11px] text-sun-400">organizers only</span>
          ) : undefined
        }
      />
      <p className="max-w-155 font-body text-[13px] text-sun-400">{section.summary}</p>
      {section.blocks.map((block, blockIndex) => (
        <Block key={blockIndex} block={block} />
      ))}
    </section>
  );
}

export default async function AdminDocsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user ? getRoleFromAppMetadata(user.app_metadata) : "user";
  const sections = DOC_SECTIONS.filter(
    (section) => !section.organizerOnly || canManageStaff(role),
  );

  return (
    <main className="mx-auto flex w-full max-w-290 flex-col gap-9 px-6 py-8 pb-20 sm:px-9">
      <SectionHeader
        title="Staff guide"
        trailing={
          <span className="font-mono text-[11px] text-sun-400">
            {sections.length} sections
          </span>
        }
      />

      <div className="grid grid-cols-1 items-start gap-9 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Contents. Pinned beside the guide where there's room, a two-column
            jump list on a phone so eleven entries don't push the guide itself
            off the first screen. */}
        <nav aria-label="Contents" className="lg:sticky lg:top-24">
          <span className="font-display text-[12px] font-semibold tracking-tight text-sun-400">
            Contents
          </span>
          <ol className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3 lg:grid-cols-1">
            {sections.map((section, index) => (
              <li key={section.id} className="flex items-baseline gap-2.5">
                <span className="font-mono text-[11px] text-sun-400">{index + 1}</span>
                <a
                  href={`#${section.id}`}
                  className="font-display text-[13px] font-medium tracking-tight text-text-brand-accent transition-colors hover:text-orange"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-11">
          {sections.map((section, index) => (
            <Section key={section.id} section={section} index={index} />
          ))}
        </div>
      </div>
    </main>
  );
}
