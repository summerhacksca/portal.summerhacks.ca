import { NfcTagList } from "@/components/admin/NfcTagList";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { getCheckinQr } from "@/lib/portal/checkinQr";
import { getPortalProfiles, getUserRolesMap } from "@/lib/portal/queries";

export default async function NfcTagsPage() {
  const [profiles, roles] = await Promise.all([getPortalProfiles(), getUserRolesMap()]);

  // Rendered small: this is a scan-and-copy list, not a display QR, and a
  // full-size PNG per hacker would balloon the payload.
  const tags = await Promise.all(
    profiles.map(async (profile) => {
      const { url, dataUrl } = await getCheckinQr(profile.nfc_id, 200);
      return {
        userId: profile.user_id,
        fullName: profile.full_name,
        email: profile.email,
        role: roles.get(profile.user_id) ?? "hacker",
        checkInUrl: url,
        qrDataUrl: dataUrl,
      };
    }),
  );

  return (
    <main className="mx-auto flex w-full max-w-290 flex-col gap-7 px-6 py-8 pb-20 sm:px-9">
      <SectionHeader
        title="NFC tags"
        trailing={
          <span className="font-mono text-[11px] text-sun-400">
            {tags.length} {tags.length === 1 ? "person" : "people"}
          </span>
        }
      />
      <p className="max-w-155 font-body text-[14px] leading-relaxed text-base-800">
        Each hacker has one permanent check-in URL. Copy it here and write it to their tag with
        an NFC writer app - the QR beside it encodes the same URL, so a phone camera and a tag
        tap land on the same page.
      </p>
      <NfcTagList tags={tags} />
    </main>
  );
}
