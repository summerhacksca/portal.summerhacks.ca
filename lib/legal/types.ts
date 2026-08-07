/**
 * Shared shape for the Terms of Use and Privacy Policy. Same content-as-data
 * convention as DOC_SECTIONS in ../portal/docs.ts and the trek copy in
 * ../portal/trek.ts, so app/legal/terms and app/legal/privacy stay thin
 * renderers and their tables of contents derive from the same arrays they
 * render rather than being hand-maintained beside them.
 *
 * Kept smaller than DocBlock: legal text needs inline mailto: links (the
 * admin@openskiesinitiative.org address appears mid-sentence in both
 * documents) and numbered clause lists, but none of DocBlock's table/steps/faq
 * kinds.
 */

export type LegalInline = string | { text: string; href: string };

export type LegalBlock =
  | { kind: "prose"; content: LegalInline[] }
  | { kind: "heading"; text: string }
  /** Each item is its own run of inline segments, so a clause can end in a link. */
  | { kind: "list"; items: LegalInline[][] }
  /** Pulled out of the flow - for the one or two lines that most need reading. */
  | { kind: "note"; content: LegalInline[] };

export type LegalSection = {
  /** Anchor target, React key, and TOC entry. */
  id: string;
  title: string;
  blocks: LegalBlock[];
};
