import "server-only";

/** Public origin of this deployment (e.g. https://portal.summerhacks.ca). */
export function getSiteUrl(): string {
  const url = process.env.SITE_URL?.trim();
  if (!url) throw new Error("SITE_URL environment variable is not set");

  return url.replace(/\/$/, "");
}

/** The single URL a hacker's QR code and NFC tag both point at. */
export function checkInUrlFor(nfcId: string): string {
  return `${getSiteUrl()}/admin/checkin/${nfcId}`;
}
