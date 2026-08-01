import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EVENT_TYPE_DISCORD_COLOR } from "@/lib/portal/eventTypes";
import type { ScheduleEventType } from "@/lib/portal/types";

/** How far ahead of an event's start time we ping Discord. */
const LEAD_MINUTES = 15;

const LOG_PREFIX = "[events/notify]";

function logError(message: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`${LOG_PREFIX} ${message}`, error);
  if (context) console.debug(`${LOG_PREFIX} error context:`, context);
}

type DueEvent = {
  id: string;
  title: string;
  starts_at: string;
  location: string;
  type: ScheduleEventType;
};

/**
 * Compares the Authorization header against CRON_SECRET.
 * Constant-time, and fails closed if CRON_SECRET is unset (an empty expected
 * value must never match an empty/missing header).
 */
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return false;

  const expectedBuf = Buffer.from(expected);
  const tokenBuf = Buffer.from(token);
  if (expectedBuf.length !== tokenBuf.length) return false;

  return timingSafeEqual(expectedBuf, tokenBuf);
}

/** Discord's <t:unix:…> markup renders in each reader's own timezone. */
function buildEmbed(event: DueEvent) {
  const unix = Math.floor(new Date(event.starts_at).getTime() / 1000);

  return {
    title: `⏰ ${event.title}`,
    color: EVENT_TYPE_DISCORD_COLOR[event.type],
    fields: [
      { name: "Starts", value: `<t:${unix}:t> · <t:${unix}:R>`, inline: true },
      { name: "Location", value: event.location || "TBA", inline: true },
      { name: "Type", value: event.type, inline: true },
    ],
    footer: { text: "SummerHacks" },
    timestamp: event.starts_at,
  };
}

async function sendToDiscord(webhookUrl: string, event: DueEvent) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [buildEmbed(event)] }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logError("Discord webhook request failed", new Error(`status ${response.status}`), {
      eventId: event.id,
      eventTitle: event.title,
      status: response.status,
      body: body.slice(0, 500),
    });
    throw new Error(`Discord webhook returned ${response.status}: ${body}`);
  }
}

/**
 * POST /api/events/notify — called every 5 minutes by the
 * private.notify_upcoming_events() pg_cron job (see
 * migrations/0007_event_discord_notifications.sql). Not user-facing:
 * authorization is a shared bearer secret, not a portal session, and this
 * route is outside proxy.ts's matcher so no session middleware runs first.
 *
 * Flow: atomically claim due, un-notified events (flips discord_notified in
 * the same statement that selects them, so two overlapping cron ticks can't
 * double-claim), send one Discord embed per event, and release any event
 * whose send fails back to discord_notified = false so the next tick retries
 * it while it's still inside the window.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    logError("Unauthorized request", new Error("invalid or missing bearer token"), {
      hasAuthorizationHeader: request.headers.has("authorization"),
      cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    logError("Server misconfigured", new Error("DISCORD_WEBHOOK_URL is not set"));
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + LEAD_MINUTES * 60_000);

  const { data: claimed, error } = await admin
    .from("schedule_events")
    .update({ discord_notified: true })
    .eq("discord_notified", false)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", windowEnd.toISOString())
    .select("id, title, starts_at, location, type");

  if (error) {
    logError("Failed to claim due events", error, {
      windowStart: now.toISOString(),
      windowEnd: windowEnd.toISOString(),
      leadMinutes: LEAD_MINUTES,
    });
    return NextResponse.json({ error: "Failed to query schedule" }, { status: 500 });
  }

  const dueEvents = (claimed ?? []) as DueEvent[];
  if (dueEvents.length === 0) {
    return NextResponse.json({ notified: 0, failed: 0 }, { status: 200 });
  }

  let notified = 0;
  let failed = 0;

  // Sequential, not Promise.all: a handful of events at most, and it keeps
  // us clear of Discord's per-webhook rate limit.
  for (const event of dueEvents) {
    try {
      await sendToDiscord(webhookUrl, event);
      notified += 1;
    } catch (sendError) {
      logError(`Failed to send Discord notification for event ${event.id}`, sendError, {
        eventId: event.id,
        eventTitle: event.title,
        eventType: event.type,
        startsAt: event.starts_at,
      });
      failed += 1;

      const { error: releaseError } = await admin
        .from("schedule_events")
        .update({ discord_notified: false })
        .eq("id", event.id);

      if (releaseError) {
        logError(`Failed to release event ${event.id} after send failure`, releaseError, {
          eventId: event.id,
          priorSendError: sendError instanceof Error ? sendError.message : String(sendError),
        });
      }
    }
  }

  return NextResponse.json(
    { notified, failed, events: dueEvents.map((e) => e.id) },
    { status: 200 },
  );
}
