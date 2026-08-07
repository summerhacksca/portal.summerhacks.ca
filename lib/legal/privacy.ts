import type { LegalSection } from "./types";
import { TERMS_META } from "./terms";

/**
 * Privacy Policy for this portal (portal.summerhacks.ca), written directly
 * from what the codebase actually does - not a generic template. Every claim
 * here should be checkable against a specific table, bucket, or env var; see
 * the file header comments in migrations/ and lib/portal/queries.ts for the
 * source of truth this was drafted from.
 *
 * Scope: this document covers the hacker/volunteer/organizer portal. The
 * separate Devpost registration form referenced in the Terms of Use
 * (../legal/terms.ts, section 2) is a third-party platform this codebase does
 * not touch and this policy does not speak for.
 *
 * PRIVACY_VERSION is tracked the same way as TERMS_VERSION - bump it to make
 * every signed-in user re-accept on their next visit.
 */
export const PRIVACY_VERSION = "2026-08-06";
export const PRIVACY_LAST_UPDATED = "August 6, 2026";

export const PRIVACY_INTRO: LegalSection = {
  id: "intro",
  title: "SummerHacks Privacy Policy",
  blocks: [
    {
      kind: "prose",
      content: [
        `This policy explains what the SummerHacks hacker portal (portal.summerhacks.ca) collects, how it's used, and who can see it. It covers the portal only - the sign-up flow before you're accepted runs on Devpost, a third-party platform with its own privacy practices.`,
      ],
    },
    {
      kind: "prose",
      content: [
        `SummerHacks (${TERMS_META.eventDates}, ${TERMS_META.venue}) is organized by ${TERMS_META.organizer}. Questions about this policy can be directed to `,
        { text: TERMS_META.contactEmail, href: `mailto:${TERMS_META.contactEmail}` },
        ".",
      ],
    },
  ],
};

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "information-we-collect",
    title: "1. Information we collect",
    blocks: [
      {
        kind: "prose",
        content: [
          "We collect only what the portal needs to run sign-in, your profile, event check-in, and the Third Space Trek scavenger hunt.",
        ],
      },
      { kind: "heading", text: "Account & sign-in" },
      {
        kind: "list",
        items: [
          ["Your email address, used to send a one-time sign-in code or link. We don't use passwords."],
        ],
      },
      { kind: "heading", text: "Profile" },
      {
        kind: "list",
        items: [
          [
            "Full name, team name, school, program, and year of study, tracks you're interested in, and - if you choose to add one - a resume (either a pasted link or an uploaded PDF, stored privately).",
          ],
          [
            "A permanent, non-guessable ID tied to your account (derived from it, not personal information itself) that's embedded in your QR code and NFC tag for check-in.",
          ],
        ],
      },
      { kind: "heading", text: "RSVP" },
      {
        kind: "list",
        items: [["Whether you're attending, and whether you'll be arriving from downtown Toronto."]],
      },
      { kind: "heading", text: "Event check-in" },
      {
        kind: "list",
        items: [
          [
            "Which meals or registration checkpoints you've been checked into, when, and which staff member scanned you in.",
          ],
        ],
      },
      { kind: "heading", text: "Third Space Trek (optional)" },
      {
        kind: "list",
        items: [
          [
            "If you join a team: your team's name and join code, who's on it, and any photos your team submits during the hunt. Photos are stripped of location metadata by your browser before upload where supported.",
          ],
        ],
      },
      { kind: "heading", text: "Demographic survey (optional, anonymous)" },
      {
        kind: "list",
        items: [
          [
            "A short survey linked from the portal, hosted on Google Forms. It's anonymous by design and isn't connected to your portal account or email.",
          ],
        ],
      },
      {
        kind: "note",
        content: [
          "The Terms of Use mention dietary restrictions and accessibility needs collected \"during registration.\" That collection happens on Devpost, at sign-up, before you have a portal account - the portal itself does not have fields for this and does not store it. If you have an accessibility or dietary need, please make sure it reaches us through registration or by emailing us directly.",
        ],
      },
    ],
  },
  {
    id: "how-we-use-it",
    title: "2. How we use it",
    blocks: [
      {
        kind: "list",
        items: [
          ["To run sign-in and keep your session secure."],
          ["To show your schedule, the venue map, and your own profile and check-in status."],
          ["To let volunteers confirm your identity at meals and registration by scanning your QR code or NFC tag."],
          ["To run the Third Space Trek, if you choose to take part."],
          ["To send event announcements to the portal and, where an announcement is marked for it, to our public Discord."],
        ],
      },
      {
        kind: "prose",
        content: ["We do not use your data for advertising, and we do not sell it."],
      },
    ],
  },
  {
    id: "who-we-share-it-with",
    title: "3. Who we share it with",
    blocks: [
      {
        kind: "prose",
        content: [
          "We use a small number of service providers to run the portal. Each only receives what it needs to do its job:",
        ],
      },
      {
        kind: "list",
        items: [
          [
            "Supabase — hosts our database, handles sign-in, sends sign-in emails, and stores uploaded files (resumes, Trek photos) in private storage.",
          ],
          ["Vercel — hosts the portal itself."],
          [
            "Google Forms — hosts the optional, anonymous demographic survey. If you take it, your responses go directly to Google Forms, not through the portal.",
          ],
          [
            "Discord — some announcements posted in the portal are also posted to our public Discord server. Those posts contain only the announcement text and event details, never your personal information.",
          ],
        ],
      },
      { kind: "heading", text: "Staff access" },
      {
        kind: "prose",
        content: [
          "Volunteers and organizers can see hacker profiles as part of running the event - for example, to confirm your identity at check-in, or to look up your resume if you've uploaded one for our resume book. This access is limited to portal staff and is not the same as public visibility.",
        ],
      },
      { kind: "heading", text: "Sponsors" },
      {
        kind: "prose",
        content: [
          "The portal itself does not currently export or share participant data with sponsors. If a sponsor resume book or booth-scan program is offered separately, it will be opt-in and described at the time.",
        ],
      },
    ],
  },
  {
    id: "cookies",
    title: "4. Cookies and local storage",
    blocks: [
      {
        kind: "prose",
        content: [
          "We use cookies and browser storage only to keep you signed in and remember small UI preferences. Nothing here is used for advertising or cross-site tracking, and we don't run analytics or error-tracking scripts on the portal.",
        ],
      },
      {
        kind: "list",
        items: [
          ["Sign-in cookies, which keep you logged in and expire after a period of inactivity."],
          [
            "A dismissal flag for the demographic survey banner, cleared when you close your browser tab.",
          ],
          [
            "On staff devices only: which check-in event is currently selected, so volunteers don't have to reselect it between scans.",
          ],
        ],
      },
    ],
  },
  {
    id: "data-retention",
    title: "5. Data retention",
    blocks: [
      {
        kind: "note",
        content: [
          "Proposed retention periods below — pending organizer confirmation before this policy is finalized. The portal has no automatic deletion job today, so until this is confirmed and built, data is retained indefinitely.",
        ],
      },
      {
        kind: "list",
        items: [
          [
            "Event data (profile, RSVP, check-in records, Trek submissions) — retained through the end of the year the event took place, then deleted, unless you ask us to delete it sooner.",
          ],
          [
            "Resumes — deleted within 90 days of the event unless you've separately opted into an ongoing resume book.",
          ],
          [
            "If your account is deleted, your profile, RSVP, and role records are removed immediately; any resume or Trek photo you uploaded is deleted separately by our team.",
          ],
        ],
      },
    ],
  },
  {
    id: "your-rights",
    title: "6. Your rights",
    blocks: [
      {
        kind: "prose",
        content: [
          "You can review and update most of your profile information yourself from the portal at any time. For anything else - seeing a copy of your data, correcting it, or asking us to delete your account - email us and we'll handle it directly:",
        ],
      },
      {
        kind: "list",
        items: [
          [{ text: TERMS_META.contactEmail, href: `mailto:${TERMS_META.contactEmail}` }],
        ],
      },
      {
        kind: "prose",
        content: [
          "We don't yet have a self-serve export or delete-my-account button in the portal; requests made this way are handled manually by our team.",
        ],
      },
    ],
  },
  {
    id: "security",
    title: "7. Security",
    blocks: [
      {
        kind: "prose",
        content: [
          "Access to your data is restricted by row-level database policies, so hackers can only ever read and edit their own profile, and staff access is limited to what running the event requires. Resumes and Trek photos are stored in private, access-controlled storage - never publicly listed - and are only ever shared as short-lived links.",
        ],
      },
    ],
  },
  {
    id: "changes",
    title: "8. Changes to this policy",
    blocks: [
      {
        kind: "prose",
        content: [
          "If we make a material change to this policy, we'll update the date at the top and ask you to review and accept it again the next time you sign in.",
        ],
      },
    ],
  },
  {
    id: "contact",
    title: "9. Contact",
    blocks: [
      {
        kind: "list",
        items: [
          [
            "Questions about this policy, or requests about your data, can be directed to ",
            { text: TERMS_META.contactEmail, href: `mailto:${TERMS_META.contactEmail}` },
            ".",
          ],
        ],
      },
    ],
  },
];
