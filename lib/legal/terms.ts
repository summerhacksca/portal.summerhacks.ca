import type { LegalSection } from "./types";

/**
 * The Terms of Use, reproduced verbatim from the source document approved by
 * Open Skies Initiative - with one correction: section 2 read "without refund
 * (if applicle)"; that's fixed to "(if applicable)" here. Nothing else about
 * the text was changed.
 *
 * TERMS_VERSION is the entire re-consent mechanism: components/legal/
 * TermsAcceptance.tsx blocks the portal for anyone whose latest
 * legal_acceptances row for "terms" doesn't match this string (see
 * hasAcceptedCurrentTerms in ../portal/queries.ts). Bumping it - for a real
 * change to these terms, not a typo fix - makes every signed-in user, including
 * ones who already accepted an older version, see the acceptance screen again
 * on their next visit.
 */
export const TERMS_VERSION = "2026-08-06";
export const TERMS_LAST_UPDATED = "August 6, 2026";

export const TERMS_META = {
  eventDates: "August 8–9, 2026",
  venue: "Stackt Market, Toronto",
  organizer: "Open Skies Initiative",
  contactEmail: "admin@openskiesinitiative.org",
};

export const TERMS_INTRO: LegalSection = {
  id: "intro",
  title: "SummerHacks Terms of Use",
  blocks: [
    {
      kind: "prose",
      content: [
        "By registering for SummerHacks (\"the Event\"), you agree to the following Terms of Use. Please read them carefully. If you do not agree, please do not register or attend.",
      ],
    },
  ],
};

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "eligibility",
    title: "1. Eligibility",
    blocks: [
      {
        kind: "list",
        items: [
          ["Participants must meet any age or eligibility requirements stated on the registration page."],
          [
            "Open Skies Initiative reserves the right to verify eligibility and to refuse or revoke registration at its discretion.",
          ],
        ],
      },
    ],
  },
  {
    id: "registration-conduct",
    title: "2. Registration & Conduct",
    blocks: [
      {
        kind: "list",
        items: [
          [
            "Registration is done through the official Devpost platform. You are responsible for the accuracy of the information you submit.",
          ],
          [
            "All participants, mentors, judges, sponsors, volunteers, and staff are expected to follow the SummerHacks Code of Conduct at all times, both in-person and in any associated online spaces (e.g., Discord).",
          ],
          [
            "Open Skies Initiative reserves the right to remove any individual from the Event, without refund (if applicable), for violations of the Code of Conduct, this agreement, or applicable law.",
          ],
        ],
      },
    ],
  },
  {
    id: "media-consent",
    title: "3. Media Consent",
    blocks: [
      {
        kind: "list",
        items: [
          [
            "By registering for and/or attending SummerHacks, you acknowledge that photography, video, and audio recording will occur throughout the venue for the duration of the Event.",
          ],
          [
            "Unless you have opted out via emailing ",
            { text: "admin@openskiesinitiative.org", href: "mailto:admin@openskiesinitiative.org" },
            ", you consent to Open Skies Initiative's use of your likeness in photos, videos, and other media for promotional, archival, and educational purposes across web, print, and social media, without compensation.",
          ],
          [
            "If you do not consent to being photographed or filmed, please email ",
            { text: "admin@openskiesinitiative.org", href: "mailto:admin@openskiesinitiative.org" },
            " so our media team can accommodate this.",
          ],
        ],
      },
    ],
  },
  {
    id: "intellectual-property",
    title: "4. Intellectual Property",
    blocks: [
      {
        kind: "list",
        items: [
          [
            "Participants retain ownership of the intellectual property they create during the Event (\"Project\"), subject to any separate agreements with sponsors (e.g., for bonus-track submissions tied to a specific sponsor's challenge).",
          ],
          [
            "By submitting a Project, you grant Open Skies Initiative and its sponsors a non-exclusive, royalty-free, worldwide license to display, demo, and promote your Project (including name, description, screenshots, and demo video) in connection with the Event, judging, and post-event promotional materials.",
          ],
          [
            "You represent that your Project does not infringe on the intellectual property rights of any third party, and that any pre-existing code, assets, or datasets used are properly licensed or attributed per the hacker guide's rules.",
          ],
        ],
      },
    ],
  },
  {
    id: "liability-waiver",
    title: "5. Assumption of Risk & Liability Waiver",
    blocks: [
      {
        kind: "list",
        items: [
          [
            "Participation in SummerHacks is voluntary. You acknowledge that attending an in-person, multi-day event carries inherent risks (including but not limited to physical injury, illness, or property loss/damage).",
          ],
          [
            "To the fullest extent permitted by law, you release Open Skies Initiative, its directors, officers, volunteers, sponsors, and the venue (Stackt Market) from any and all claims, liabilities, or damages arising from your participation in the Event, except where caused by gross negligence or willful misconduct on their part.",
          ],
          [
            "You are responsible for your own personal belongings; Open Skies Initiative is not liable for lost, stolen, or damaged items.",
          ],
        ],
      },
    ],
  },
  {
    id: "health-safety",
    title: "6. Health & Safety",
    blocks: [
      {
        kind: "list",
        items: [
          [
            "Participants agree to follow all venue safety rules and any Event-specific health guidelines communicated before or during SummerHacks.",
          ],
          [
            "Participants with medical conditions, allergies, or accessibility needs are encouraged to notify organizers in advance so reasonable accommodations can be made.",
          ],
        ],
      },
    ],
  },
  {
    id: "data-privacy",
    title: "7. Data & Privacy",
    blocks: [
      {
        kind: "list",
        items: [
          [
            "Personal information collected during registration (e.g., name, email, dietary/accessibility needs) is used solely for Event logistics and communication, and is not sold to third parties.",
          ],
          [
            "Optional demographic survey data is collected anonymously and used in aggregate for internal reporting and event improvement purposes.",
          ],
          [
            "Sponsor access to participant data (e.g., resumes, contact info) is limited to what participants explicitly opt into (e.g., resume book, sponsor booth interactions).",
          ],
        ],
      },
      {
        kind: "note",
        content: [
          "See our ",
          { text: "Privacy Policy", href: "/legal/privacy" },
          " for the full detail of what this portal collects and how it's used.",
        ],
      },
    ],
  },
  {
    id: "cancellation-changes",
    title: "8. Cancellation & Changes",
    blocks: [
      {
        kind: "list",
        items: [
          [
            "Open Skies Initiative reserves the right to modify Event dates, format, venue, schedule, or activities due to circumstances beyond its control.",
          ],
          [
            "In the event of cancellation, Open Skies Initiative will make reasonable efforts to notify registrants promptly via email and official communication channels.",
          ],
        ],
      },
    ],
  },
  {
    id: "disqualification",
    title: "9. Disqualification",
    blocks: [
      {
        kind: "list",
        items: [
          [
            "Open Skies Initiative and the judging team reserve the right to disqualify any Project or participant found to be in violation of the hacker guide rules, judging brief, or this agreement — including but not limited to plagiarism, pre-built projects submitted as new work, or unsafe/harmful project content.",
          ],
        ],
      },
    ],
  },
  {
    id: "governing-law",
    title: "10. Governing Law",
    blocks: [
      {
        kind: "list",
        items: [["These Terms are governed by the laws of the Province of Ontario, Canada."]],
      },
    ],
  },
  {
    id: "contact",
    title: "11. Contact",
    blocks: [
      {
        kind: "list",
        items: [
          [
            "Questions about these Terms can be directed to ",
            { text: "admin@openskiesinitiative.org", href: "mailto:admin@openskiesinitiative.org" },
            ".",
          ],
        ],
      },
    ],
  },
];

export const TERMS_CLOSING = "By completing registration, you confirm that you have read, understood, and agree to these Terms of Use.";
