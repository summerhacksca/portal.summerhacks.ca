import "server-only";
import QRCode from "qrcode";
import { checkInUrlFor } from "./siteUrl";

/**
 * The check-in URL for a hacker plus a QR encoding of it. Rendered at 2× the
 * display size so it stays crisp on a phone screen held up to a scanner.
 */
export async function getCheckinQr(nfcId: string, width = 448) {
  const url = checkInUrlFor(nfcId);

  const dataUrl = await QRCode.toDataURL(url, {
    margin: 1,
    width,
    color: { dark: "#2a2a2a", light: "#ffffff" },
  });

  return { url, dataUrl };
}
