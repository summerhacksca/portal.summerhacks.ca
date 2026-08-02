/**
 * Shared Discord webhook client. Extracted from app/api/events/notify/route.ts
 * (the original consumer, event start pings) so /admin/announcements can post
 * to the same DISCORD_WEBHOOK_URL without duplicating the fetch/error
 * handling.
 */

export type DiscordEmbed = {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
};

export type DiscordWebhookPayload = {
  content?: string;
  embeds?: DiscordEmbed[];
};

/** Reads DISCORD_WEBHOOK_URL. Null when unset, so callers can no-op or warn instead of throwing. */
export function getDiscordWebhookUrl(): string | null {
  return process.env.DISCORD_WEBHOOK_URL || null;
}

/** POSTs to a Discord webhook. Throws on a non-2xx response; callers decide how to handle that. */
export async function postToDiscord(
  webhookUrl: string,
  payload: DiscordWebhookPayload,
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Discord webhook returned ${response.status}: ${body}`);
  }
}
