#!/usr/bin/env node
/**
 * Bulk-promote accounts to the `hacker` role, from JSON in scripts/data/.
 *
 *   node scripts/promote-hackers.mjs                  # every scripts/data/*.json
 *   node scripts/promote-hackers.mjs accepted         # scripts/data/accepted.json
 *   node scripts/promote-hackers.mjs path/to/list.json
 *   node scripts/promote-hackers.mjs a@uwaterloo.ca b@uwaterloo.ca
 *
 * Each file is a JSON array of addresses:
 *
 *   ["a@uwaterloo.ca", "b@uwaterloo.ca"]
 *
 * Flags:
 *   --role <role>        hacker (default) | volunteer | organizer | user
 *   --dry-run            resolve every email and report, write nothing
 *   --failed-out <path>  write the failed emails, one per line; a bare filename
 *                        goes to scripts/data/, which is gitignored
 *   --allow-demote       permit lowering a role (e.g. organizer → hacker)
 *
 * Promotion goes through the public.set_user_role() RPC rather than writing
 * auth.users.raw_app_meta_data directly. That is the only path that updates
 * public.user_roles, which is what fires the trigger provisioning the hacker's
 * profile and nfc_id (migrations/0005 and 0006). Editing the metadata by hand
 * grants portal access without a profile.
 *
 * Re-running is safe and idempotent: the RPC upserts, so an account already at
 * the target role is re-stamped and its profile re-provisioned if missing.
 *
 * Requires SUPABASE_SECRET_KEY, so run it locally - never ship it to a client.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

/**
 * Ordered least to most privileged - the index doubles as the demotion check.
 * superadmin is included so an existing superadmin's indexOf isn't -1 (which
 * would read as "lower than everything" and let this script silently demote
 * one past the --allow-demote guard), but it is not a valid --role target -
 * superadmin is set by hand in the database, never through a script.
 */
const ROLES = ["user", "hacker", "volunteer", "organizer", "superadmin"];
const ASSIGNABLE_ROLES = ROLES.filter((role) => role !== "superadmin");
const PAGE_SIZE = 1000;
const CONCURRENCY = 8;

/** Anchored beside this script, not to the cwd, so it runs from anywhere. */
const DATA_DIR = fileURLToPath(new URL("./data/", import.meta.url));

function jsonFilesIn(dir) {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => join(dir, name));
}

/**
 * Resolve a positional to file paths: an existing path is used as given, a
 * directory expands to its *.json, and a bare name falls back to
 * scripts/data/<name>.json.
 */
function resolveInput(arg) {
  const candidates = [arg, join(DATA_DIR, arg), join(DATA_DIR, `${arg}.json`)];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    return statSync(candidate).isDirectory() ? jsonFilesIn(candidate) : [candidate];
  }

  throw new Error(`No such file: ${arg} (also looked in scripts/data/ for ${arg}.json)`);
}

/** One file: a JSON array of addresses. */
function readEmailsFrom(filePath) {
  const label = basename(filePath);
  const text = readFileSync(filePath, "utf8");

  if (!filePath.endsWith(".json")) {
    // Plain-text fallback: one address per line, `#` comments allowed.
    return text
      .split(/\r?\n/)
      .map((line) => line.split("#")[0].trim())
      .filter(Boolean);
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${label}: invalid JSON - ${error.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`${label}: expected a JSON array of email addresses`);
  }

  return parsed.map((item, index) => {
    if (typeof item !== "string" || !item.trim()) {
      throw new Error(
        `${label}[${index}]: expected an email address, got ${JSON.stringify(item)}`,
      );
    }
    return item.trim();
  });
}

/**
 * Positionals containing `@` are literal addresses; everything else is a path.
 * With no positionals at all, read every JSON file in scripts/data/.
 */
function collectEmails(positionals) {
  const emails = [];
  const files = [];

  for (const arg of positionals) {
    if (arg.includes("@")) {
      emails.push(arg.trim());
    } else {
      files.push(...resolveInput(arg));
    }
  }

  if (files.length === 0 && emails.length === 0) {
    if (!existsSync(DATA_DIR)) {
      throw new Error(`No emails given and ${DATA_DIR} does not exist.`);
    }

    files.push(...jsonFilesIn(DATA_DIR));

    if (files.length === 0) {
      throw new Error(`No .json files in ${DATA_DIR}.`);
    }
  }

  for (const file of files) {
    const found = readEmailsFrom(file);
    console.log(`  ${basename(file)}: ${found.length} email${found.length === 1 ? "" : "s"}`);
    emails.push(...found);
  }

  // Dedupe case-insensitively but report back the spelling that was given.
  const seen = new Set();
  return emails.filter((email) => {
    const key = email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * One pass over every auth account, keyed by lowercased email. GoTrue has no
 * lookup-by-email admin endpoint, and paging once beats a request per address.
 */
async function loadUsersByEmail(supabase) {
  const byEmail = new Map();

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });

    if (error) {
      throw new Error(`Failed to list users (page ${page}): ${error.message}`);
    }

    for (const user of data.users) {
      if (user.email) byEmail.set(user.email.toLowerCase(), user);
    }

    if (data.users.length < PAGE_SIZE) break;
  }

  return byEmail;
}

/** Run `worker` over `items` with a bounded number of in-flight requests. */
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  });

  await Promise.all(runners);
  return results;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      role: { type: "string", default: "hacker" },
      "dry-run": { type: "boolean", default: false },
      "failed-out": { type: "string" },
      "allow-demote": { type: "boolean", default: false },
    },
  });

  const role = values.role;
  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new Error(`--role must be one of ${ASSIGNABLE_ROLES.join(", ")} (got "${role}")`);
  }

  // Anchored to the repo root rather than the cwd so the script runs from
  // anywhere. Env may also come from the shell, so a missing .env is not fatal.
  try {
    process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));
  } catch {}

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  }

  console.log("Reading:");
  const emails = collectEmails(positionals);
  if (emails.length === 0) {
    throw new Error("No emails found in the input.");
  }

  const supabase = createClient(url, secretKey);

  console.log(`\nResolving ${emails.length} unique email${emails.length === 1 ? "" : "s"}…`);
  const usersByEmail = await loadUsersByEmail(supabase);
  console.log(`Scanned ${usersByEmail.size} accounts.\n`);

  const outcomes = await mapWithConcurrency(emails, CONCURRENCY, async (email) => {
    const user = usersByEmail.get(email.toLowerCase());

    if (!user) {
      return { email, status: "failed", reason: "no account with that email" };
    }

    const previousRole = user.app_metadata?.role ?? "user";

    // A staff address landing in an accepted-hackers list would otherwise strip
    // that person's /admin access. Surface it as a failure so it gets noticed.
    if (!values["allow-demote"] && ROLES.indexOf(previousRole) > ROLES.indexOf(role)) {
      return {
        email,
        userId: user.id,
        status: "failed",
        reason: `would demote ${previousRole} → ${role}; pass --allow-demote to force`,
      };
    }

    if (values["dry-run"]) {
      return { email, userId: user.id, status: "dry-run", previousRole };
    }

    const { error } = await supabase.rpc("set_user_role", {
      target_user_id: user.id,
      new_role: role,
    });

    if (error) {
      return { email, userId: user.id, status: "failed", reason: error.message };
    }

    return {
      email,
      userId: user.id,
      status: previousRole === role ? "unchanged" : "promoted",
      previousRole,
    };
  });

  const failed = outcomes.filter((o) => o.status === "failed");
  const promoted = outcomes.filter((o) => o.status === "promoted");
  const unchanged = outcomes.filter((o) => o.status === "unchanged");
  const dryRun = outcomes.filter((o) => o.status === "dry-run");

  for (const outcome of promoted) {
    console.log(`  promoted   ${outcome.email}  (${outcome.previousRole} → ${role})`);
  }
  for (const outcome of unchanged) {
    console.log(`  unchanged  ${outcome.email}  (already ${role})`);
  }
  for (const outcome of dryRun) {
    const verb = outcome.previousRole === role ? "already" : "would promote from";
    console.log(`  dry-run    ${outcome.email}  (${verb} ${outcome.previousRole})`);
  }

  // The whole point of promoting is that a profile + nfc_id gets provisioned,
  // so confirm the trigger from migrations/0006 actually fired.
  const writtenIds = [...promoted, ...unchanged].map((o) => o.userId);
  if (writtenIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, nfc_id")
      .in("user_id", writtenIds);

    if (error) {
      console.warn(`\nCould not verify profiles: ${error.message}`);
    } else {
      const withTag = new Set(data.filter((row) => row.nfc_id).map((row) => row.user_id));
      const missing = [...promoted, ...unchanged].filter((o) => !withTag.has(o.userId));

      if (missing.length > 0) {
        console.warn(
          `\n${missing.length} account(s) have no profile or nfc_id - has ` +
            `migrations/0006_profile_provisioning.sql been run?`,
        );
        for (const outcome of missing) console.warn(`  ${outcome.email}`);
      }
    }
  }

  if (failed.length > 0) {
    console.error(`\nFailed (${failed.length}):`);
    for (const outcome of failed) {
      console.error(`  ${outcome.email}  - ${outcome.reason}`);
    }

    if (values["failed-out"]) {
      // A bare filename lands in scripts/data/, which is gitignored - this file
      // holds real applicant addresses and must not drift into the repo.
      const target = values["failed-out"].includes("/")
        ? values["failed-out"]
        : join(DATA_DIR, values["failed-out"]);

      writeFileSync(target, failed.map((o) => o.email).join("\n") + "\n");
      console.error(`\nWrote failed emails to ${target}`);
    }
  }

  const summary = values["dry-run"]
    ? `${dryRun.length} resolved`
    : `${promoted.length} promoted, ${unchanged.length} unchanged`;
  console.log(`\n${summary}, ${failed.length} failed, ${emails.length} total.`);

  process.exitCode = failed.length > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
