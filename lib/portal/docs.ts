/**
 * The staff guide rendered at /admin/docs.
 *
 * Content lives here as data rather than JSX for the same reason the trek
 * rules do (see TREK_STEPS / TREK_GROUND_RULES in ./trek.ts): the page stays a
 * thin renderer, and the table of contents is derived from DOC_SECTIONS rather
 * than hand-maintained beside it.
 *
 * Volunteers reach this page too. Sections marked `organizerOnly` are filtered
 * out for them, so they get the desk job - signing in, check-in, tags, and the
 * hacker problems they will actually field - without the pages they cannot
 * open. Keep that flag on anything describing organizer-only tooling.
 */

export type FaqItem = {
  /** What the person reports, in their words. */
  symptom: string;
  cause: string;
  fix: string;
};

export type DocBlock =
  | { kind: "prose"; text: string }
  /** Sub-heading inside a section. Not a TOC entry. */
  | { kind: "heading"; text: string }
  | { kind: "steps"; items: string[] }
  | { kind: "list"; items: string[] }
  /** Pulled out of the flow - the thing people get wrong. */
  | { kind: "note"; text: string }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "faq"; items: FaqItem[] };

export type DocSection = {
  /** Anchor target and React key. */
  id: string;
  title: string;
  /** One line under the title, in the body and beside nothing in the TOC. */
  summary: string;
  /** Hidden from volunteers - anything about pages they cannot open. */
  organizerOnly?: boolean;
  blocks: DocBlock[];
};

export const DOC_SECTIONS: DocSection[] = [
  {
    id: "start-here",
    title: "Start here",
    summary: "What this page covers, and the short version for desk shifts.",
    blocks: [
      {
        kind: "prose",
        text: "This guide covers the staff side of the portal. Hackers never see it.",
      },
      {
        kind: "prose",
        text: "You are shown the parts that apply to your role. Volunteers get the desk job - signing in, checking hackers in, tags, and the problems hackers actually report. Organizers get those plus announcements, the trek, staff management and what runs behind it all.",
      },
      { kind: "heading", text: "The whole desk job, in three steps" },
      {
        kind: "steps",
        items: [
          "Scan the hacker's QR code with your phone camera, or tap their NFC tag. Both open the same check-in page.",
          "Check that the name on screen matches the person in front of you.",
          "Hit Check in. If one event is running, it already happened before you tapped anything.",
        ],
      },
      {
        kind: "note",
        text: "Check-in only applies to meals and registration. Workshops, talks and judging are not checked into, and the portal will refuse if you try.",
      },
    ],
  },

  {
    id: "roles",
    title: "Roles and access",
    summary: "Who can reach what, and how that is enforced.",
    blocks: [
      {
        kind: "prose",
        text: "Every account has exactly one role. It decides which pages load for them.",
      },
      {
        kind: "table",
        head: ["Role", "Can reach"],
        rows: [
          [
            "user",
            "Nothing. They are rejected applicants and other non-hackers and will see “Access not available”.",
          ],
          ["hacker", "The portal: schedule, map, trek, profile, and their own check-in QR."],
          ["volunteer", "The portal, plus staff check-in and NFC tags."],
          [
            "organizer",
            "All of the above, plus announcements, the trek admin and staff management.",
          ],
          [
            "superadmin",
            "Everything an organizer can do, plus granting and revoking organizer.",
          ],
        ],
      },
      {
        kind: "prose",
        text: "Access is checked in three independent places: before the page loads, in the database itself, and again inside each action when you click a button. A volunteer who types a staff-only address directly is sent back to the staff home page rather than shown an empty shell.",
      },
      {
        kind: "note",
        text: "Superadmin is never granted from this UI. It is set by hand in the database, on purpose.",
      },
    ],
  },

  {
    id: "signing-in",
    title: "Signing in",
    summary: "The 6-digit code flow, and who is allowed to request one.",
    blocks: [
      {
        kind: "prose",
        text: "There are no passwords. Everyone - staff and hackers alike - signs in with a 6-digit code sent to their email.",
      },
      {
        kind: "steps",
        items: [
          "Go to the portal login page and enter your email.",
          "Check your inbox for the code. It usually arrives within a minute.",
          "Type the 6 digits in. You stay signed in for 7 days.",
        ],
      },
      {
        kind: "prose",
        text: "The same email also contains a link. Opening it lands on a confirm page with a Continue button, and the sign-in only completes once that button is pressed. This is deliberate: corporate mail scanners open links automatically to check them, and finishing the sign-in on page load would let a scanner spend the code before the person ever clicked.",
      },
      {
        kind: "note",
        text: "The link and the 6-digit code are the same one-time token. Using one cancels the other, and requesting a new code cancels the previous one. Tell people to use the newest email, and either the code or the link - not both.",
      },
      { kind: "heading", text: "Who can request a code" },
      {
        kind: "list",
        items: [
          "Staff - anyone whose account already exists with a volunteer, organizer or superadmin role.",
          "Hackers - anyone with an application on file that is marked accepted.",
        ],
      },
      {
        kind: "prose",
        text: "Anyone else is turned away at the email step, before a code is ever sent. That is why a hacker who was accepted but never added to the system gets an error that reads like a rejection.",
      },
    ],
  },

  {
    id: "check-in",
    title: "Checking hackers in",
    summary: "The main volunteer job: scanning, auto check-in, and undo.",
    blocks: [
      {
        kind: "prose",
        text: "A hacker's QR code and their NFC tag point at the same page. You do not need to open the staff tools first - scanning takes you straight there.",
      },
      {
        kind: "prose",
        text: "The page shows who was scanned: name, email, team, school, program, year, tracks, and their resume if they uploaded one.",
      },
      { kind: "heading", text: "Automatic check-in" },
      {
        kind: "prose",
        text: "When exactly one check-in event is running, the check-in happens by itself as the page loads, and the event is shown locked rather than as a dropdown. You confirm the name and move on. An event counts as running from 15 minutes before it starts until it ends.",
      },
      { kind: "heading", text: "Picking manually" },
      {
        kind: "prose",
        text: "When nothing is running, or two events overlap, you get a dropdown and choose. The page tells you outright when nothing is running, so you know why it is asking.",
      },
      {
        kind: "list",
        items: [
          "Re-scanning someone already checked in is safe. The button reads “Already checked in” and nothing changes.",
          "Undo appears once someone is checked in. It reverses the check-in but keeps the record, so what happened stays clear.",
          "Your last manual pick is remembered on that phone. A running event always overrides it, so a stale pick from yesterday cannot be used by accident.",
        ],
      },
      {
        kind: "note",
        text: "Only meals and registration can be checked into. Trying anything else returns “event … does not require check-in”. That is the database refusing, not a bug.",
      },
      {
        kind: "prose",
        text: "One more thing worth knowing: on the hacker's own page, “Checked in” means registration specifically. A meal scan does not flip it, so do not treat a hacker showing “Not checked in yet” as proof they skipped lunch.",
      },
    ],
  },

  {
    id: "nfc-tags",
    title: "NFC tags",
    summary: "One permanent URL per hacker, and how to write it.",
    blocks: [
      {
        kind: "prose",
        text: "Each hacker has one permanent check-in URL. It never changes, and it is the only thing a tag needs to contain.",
      },
      {
        kind: "steps",
        items: [
          "Open NFC tags from the staff nav and filter by name or email.",
          "Hit Copy URL on their row.",
          "Write it to their tag with any NFC writer app.",
        ],
      },
      {
        kind: "note",
        text: "The QR thumbnail and the tag encode the same URL, so a phone camera and a tag tap land on the same page. If a scan says “No hacker found for this tag”, the tag holds a wrong or outdated URL - recopy it here and rewrite the tag.",
      },
    ],
  },

  {
    id: "announcements",
    title: "Announcements",
    summary: "Posting to the portal feed, and mirroring to Discord.",
    organizerOnly: true,
    blocks: [
      {
        kind: "prose",
        text: "Anything you post appears immediately under Live announcements on the portal home page.",
      },
      {
        kind: "list",
        items: [
          "Channel - the label shown on the post. Defaults to announcements.",
          "Accent - Normal, Urgent or Info. Urgent gets an orange tint and stands out in the feed.",
          "Body - the message itself.",
          "Also post to Discord - mirrors it to the event server.",
        ],
      },
      {
        kind: "prose",
        text: "The post is saved to the portal first, then sent to Discord. If Discord fails you get a message saying exactly that, and the announcement is still live on the portal. It is never lost to a webhook problem.",
      },
      {
        kind: "note",
        text: "Deleting an announcement removes it from the portal only. The Discord copy stays up - delete that one yourself.",
      },
    ],
  },

  {
    id: "trek",
    title: "The Third Space Trek",
    summary: "Running the scavenger hunt: settings, teams, and photo review.",
    organizerOnly: true,
    blocks: [
      {
        kind: "prose",
        text: "Teams work from spots around the city and log one photo an hour. Everything is managed from the Trek page.",
      },
      { kind: "heading", text: "Settings" },
      {
        kind: "list",
        items: [
          "Opens / Standings lock - always Toronto time, never your browser's timezone.",
          "Hunt is open - a kill switch. Uncheck it and the hunt closes immediately, whatever the schedule says.",
          "Cooldown - minutes between a team's photos. 60 by default.",
          "Max team size - 4 by default.",
          "New spot pts / Repeat spot pts - 2 and 1 by default.",
        ],
      },
      {
        kind: "note",
        text: "To test the whole flow end to end, drop the cooldown to 1 or 2 minutes, then put it back to 60 before the event.",
      },
      { kind: "heading", text: "Teams" },
      {
        kind: "prose",
        text: "The Teams list shows every team with its members, points and join code. When a team loses their code, read it to them from here - this is the only place staff can see it.",
      },
      { kind: "heading", text: "Photo review" },
      {
        kind: "prose",
        text: "Photos score the moment they are logged. Review is a correction tool, not a gate - no team is waiting on you to approve anything.",
      },
      {
        kind: "prose",
        text: "Rejecting a photo removes its points. It also hands that team's 2-point discovery bonus to their next surviving photo at the same spot, automatically. There is nothing to recalculate by hand.",
      },
      {
        kind: "note",
        text: "Approving changes no points. It only marks the photo as checked, so you can tell reviewed from unreviewed.",
      },
    ],
  },

  {
    id: "staff-management",
    title: "Staff management",
    summary: "Adding staff and changing roles.",
    organizerOnly: true,
    blocks: [
      { kind: "heading", text: "Adding someone" },
      {
        kind: "prose",
        text: "Enter their email, name and role, then Add staff member. This creates their account, so they can sign in with the normal 6-digit code straight away. No invite email goes out - tell them yourself.",
      },
      {
        kind: "note",
        text: "Only a superadmin can add an organizer. Organizers can add volunteers.",
      },
      { kind: "heading", text: "Changing roles" },
      {
        kind: "prose",
        text: "The page lists volunteers and organizers first, then hackers. Pick a new role and hit Save. Three rules are enforced, and each gives its own message:",
      },
      {
        kind: "list",
        items: [
          "You cannot change your own role.",
          "Organizer rows are read-only unless you are a superadmin.",
          "Superadmin is never offered as an option - it is set by hand in the database.",
        ],
      },
      {
        kind: "note",
        text: "Someone who has signed in but was never given a role will not appear on this page at all. An account without a role has no profile, so there is nothing to list. Promote them with the script instead - see Behind the scenes.",
      },
    ],
  },

  {
    id: "behind-the-scenes",
    title: "Behind the scenes",
    summary: "The promote script, sign-in emails, and event reminders.",
    organizerOnly: true,
    blocks: [
      { kind: "heading", text: "Promoting accepted hackers" },
      {
        kind: "prose",
        text: "scripts/promote-hackers.mjs gives accepted applicants the hacker role in bulk. It reads JSON lists of email addresses from scripts/data/, which is gitignored because those are real addresses.",
      },
      {
        kind: "list",
        items: [
          "npm run promote:dry - resolve every address and report, writing nothing.",
          "npm run promote - promote everyone in scripts/data/*.json.",
          "node scripts/promote-hackers.mjs someone@example.com - a single address.",
        ],
      },
      {
        kind: "prose",
        text: "Re-running is safe. The script only updates accounts that already exist - it never creates one - and promoting is also what provisions a hacker's profile, QR code and tag ID.",
      },
      {
        kind: "note",
        text: "Never set a role by editing account metadata by hand. That grants portal access without creating a profile, and the hacker lands on a portal that cannot load their details.",
      },
      { kind: "heading", text: "Sign-in emails" },
      {
        kind: "prose",
        text: "Supabase sends the sign-in emails, and the templates live in the Supabase dashboard rather than in this repo. Nothing in the code shows what they contain, so template changes look exactly like a code bug.",
      },
      {
        kind: "prose",
        text: "The current flow needs both the Magic Link and the Confirm Signup templates to send a 6-digit token and point their link at the confirm page. First-time accounts receive Confirm Signup; returning ones receive Magic Link. Both have to be right.",
      },
      {
        kind: "note",
        text: "When sign-in misbehaves for everyone at once, check those templates and the Site URL setting before suspecting the code.",
      },
      { kind: "heading", text: "Event reminders" },
      {
        kind: "prose",
        text: "A scheduled job runs every 5 minutes. Any event starting within the next 15 minutes gets one Discord reminder. Each event is marked as notified so it is never posted twice, and a failed send is un-marked so the next run retries it while there is still time.",
      },
    ],
  },

  {
    id: "help-hackers",
    title: "Troubleshooting - hackers",
    summary: "What hackers report, what causes it, and what to do.",
    blocks: [
      {
        kind: "prose",
        text: "Some of these need an organizer to finish. Where that is the case it says so - recognise the symptom, then hand it over with the hacker's name and email rather than guessing.",
      },
      {
        kind: "faq",
        items: [
          {
            symptom: "“No application found for this email.”",
            cause:
              "There is no application under that exact address. Usually a typo, a personal address instead of the one they applied with, or an application stored with different capitalisation.",
            fix: "Ask for the exact address they applied with. If that is right and it still fails, an organizer has to check the application row and promote them.",
          },
          {
            symptom: "“Your application has not been accepted yet.”",
            cause: "The application exists but is not marked accepted.",
            fix: "An organizer marks the application accepted, or promotes them directly. Take their name and address and pass it on.",
          },
          {
            symptom: "“Please wait a moment before requesting another code.”",
            cause: "Codes are limited to roughly one per minute per address.",
            fix: "Wait 60 seconds. The Resend button counts down and re-enables itself.",
          },
          {
            symptom: "“That code is incorrect or has expired.”",
            cause:
              "The code was already used, or a newer request replaced it. Clicking the link in the email also spends the code.",
            fix: "Request a fresh code and use only the newest email. Use either the code or the link, not both.",
          },
          {
            symptom: "The email never arrives.",
            cause: "Spam filtering, a slow mail server, or the wrong address.",
            fix: "Check junk and the Other/Focused tabs first, confirm the address on screen, then wait a minute and Resend. If nobody at all is receiving mail, it is the Supabase email setup, not this hacker.",
          },
          {
            symptom: "Signed in, but the portal says “Access not available”.",
            cause: "The account exists but has no role. They were never promoted.",
            fix: "An organizer has to promote them. Worth saying out loud: they will not show up in staff management either, so do not let anyone conclude the account is missing.",
          },
          {
            symptom: "“We couldn't load your profile.”",
            cause:
              "The account has portal access but no profile row, which happens when a role was set by editing metadata by hand.",
            fix: "An organizer re-runs the promote script for that address, which re-provisions the missing profile.",
          },
          {
            symptom: "Their tag scans, but it says “No hacker found for this tag.”",
            cause:
              "The tag points at a URL that matches nobody - usually written with an old address or a typo.",
            fix: "Find them on the NFC tags page, copy their URL and rewrite the tag. To check them in right now, open their row from that page directly.",
          },
          {
            symptom: "Trek: “No team with that code.”",
            cause: "Wrong code, or they are typing it from memory.",
            fix: "Codes are 6 characters and capitalisation does not matter. An organizer can read the real one off the Teams list.",
          },
          {
            symptom: "Trek: “Team … is full.”",
            cause: "The team has hit the max team size.",
            fix: "Either they join a different team, or an organizer raises the max team size.",
          },
          {
            symptom: "Trek: “You are already on a team.”",
            cause: "A hacker can only be on one team at a time.",
            fix: "They leave their current team first. If that team has already logged a photo, leaving is blocked - see the next entry.",
          },
          {
            symptom:
              "Trek: “Your team has already logged photos - ask an organizer if you need to switch.”",
            cause:
              "Teams lock once they start scoring, so points cannot be shuffled between them.",
            fix: "Only an organizer can undo this, directly in the database. Decide first whether the move is fair to the other teams.",
          },
          {
            symptom: "Trek: “One photo per 60 minutes…”",
            cause:
              "The team's cooldown has not elapsed. Rejected photos still count toward it.",
            fix: "Nothing to do - the page shows exactly when they can log again. Lower the cooldown in settings only if the whole hunt is running behind.",
          },
          {
            symptom: "Trek: “The Third Space Trek is not open right now.”",
            cause:
              "Either it has not started, standings are locked, or an organizer unchecked Hunt is open.",
            fix: "Expected outside the hunt window. If it should be running, an organizer checks the trek settings.",
          },
          {
            symptom: "Their photo upload fails, or nothing shows up after uploading.",
            cause: "Weak café wifi dropping the upload partway.",
            fix: "Ask them to retry on a stronger connection. Nothing partial is kept - a failed upload leaves no photo and no entry.",
          },
        ],
      },
    ],
  },

  {
    id: "help-staff",
    title: "Troubleshooting - the desk",
    summary: "Problems you will hit yourself while checking people in.",
    blocks: [
      {
        kind: "faq",
        items: [
          {
            symptom: "The check-in page did not check anyone in automatically.",
            cause:
              "Automatic check-in only fires when exactly one event is running. If nothing is running, or two overlap, it waits for you.",
            fix: "Pick the event from the dropdown and hit Check in.",
          },
          {
            symptom: "The dropdown lists the whole schedule instead of what is happening now.",
            cause: "Nothing is running at the moment, so it falls back to the full list.",
            fix: "Pick the right event manually, and double-check you are not checking someone into yesterday's dinner.",
          },
          {
            symptom: "It pre-selected the wrong event.",
            cause:
              "Your phone remembers your last manual pick. A running event overrides it, but with nothing running the old pick stays put.",
            fix: "Change it in the dropdown. The new pick is remembered instead.",
          },
          {
            symptom: "“event … does not require check-in”",
            cause:
              "That event is not a meal or registration, so the database refuses to record a check-in for it.",
            fix: "Nothing is broken. If an event genuinely needs check-in, an organizer has to mark it that way in the schedule.",
          },
          {
            symptom: "I can't see the Trek, Staff or Announcements links.",
            cause:
              "You are a volunteer. Those pages are organizer-only, and the links are hidden rather than shown and refused.",
            fix: "Nothing is wrong with your account - the desk job needs none of those pages. If you genuinely need one, ask an organizer.",
          },
        ],
      },
    ],
  },

  {
    id: "help-organizers",
    title: "Troubleshooting - organizers",
    summary: "Roles, announcements, Discord and the trek.",
    organizerOnly: true,
    blocks: [
      {
        kind: "faq",
        items: [
          {
            symptom:
              "“You cannot change your own role.” / “Only a superadmin can change organizer roles.” / “Superadmin is set manually in the database.”",
            cause:
              "The three rules that stop the role system from being used to escalate access.",
            fix: "Ask a superadmin. Superadmin itself has to be set in the database by hand.",
          },
          {
            symptom: "“Only a superadmin can add an organizer.”",
            cause: "Organizers can add volunteers, not other organizers.",
            fix: "Ask a superadmin to add them, or add them as a volunteer and have a superadmin promote them.",
          },
          {
            symptom: "I added someone but they cannot sign in.",
            cause: "Almost always a different address than the one you typed.",
            fix: "Check the spelling in staff management. If it is right, have them request a code again - adding them created the account, so they are eligible immediately.",
          },
          {
            symptom: "A role change has not taken effect for the person.",
            cause: "Their signed-in session still carries the old role.",
            fix: "Have them sign out and sign back in.",
          },
          {
            symptom: "The announcement posted, but Discord is silent.",
            cause:
              "Either the Discord webhook is not configured, or the call failed. The message on screen says which.",
            fix: "The announcement is safe on the portal either way. Check DISCORD_WEBHOOK_URL in the deployment settings, or post to Discord by hand this once.",
          },
          {
            symptom: "I deleted an announcement but it is still in Discord.",
            cause: "The portal does not track the Discord message, so it cannot retract it.",
            fix: "Delete it in Discord yourself.",
          },
          {
            symptom: "Event reminders are not appearing in Discord.",
            cause:
              "The scheduled job is not running, its secret does not match, or those events were already marked as notified.",
            fix: "Check that CRON_SECRET matches on both sides and that the scheduled job is enabled. An event already marked notified will not be sent again.",
          },
          {
            symptom: "Trek photos show as broken images in review.",
            cause: "Photo links are signed and expire after an hour.",
            fix: "Reload the page.",
          },
          {
            symptom: "The trek closed and nobody closed it.",
            cause: "The standings lock time passed.",
            fix: "Push the lock time out in the Trek settings, and check that Hunt is open is still ticked.",
          },
          {
            symptom: "Trek times saved an hour - or several hours - off.",
            cause: "They are read as Toronto time, always, not your device's timezone.",
            fix: "Enter the Toronto wall-clock time you want, even if you are working from somewhere else.",
          },
        ],
      },
    ],
  },
];
