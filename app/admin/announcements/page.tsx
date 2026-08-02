import { redirect } from "next/navigation";
import { AnnouncementComposer } from "@/components/admin/AnnouncementComposer";
import { AnnouncementList } from "@/components/admin/AnnouncementList";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { canManageStaff, getRoleFromAppMetadata } from "@/lib/auth/roles";
import { getAnnouncements } from "@/lib/portal/queries";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const viewerRole = user ? getRoleFromAppMetadata(user.app_metadata) : "user";

  // app/admin/layout.tsx deliberately has no auth check (proxy.ts + RLS are
  // the real gate) - re-check here so a volunteer landing directly on this
  // URL gets bounced instead of an empty shell.
  if (!user || !canManageStaff(viewerRole)) {
    redirect("/admin");
  }

  const announcements = await getAnnouncements();

  return (
    <main className="mx-auto flex w-full max-w-290 flex-col gap-9 px-6 py-8 pb-20 sm:px-9">
      <SectionHeader
        title="Announcements"
        trailing={<span className="font-mono text-[11px] text-sun-400">synced to /portal</span>}
      />
      <p className="max-w-155 font-body text-[14px] leading-relaxed text-base-800">
        Posts appear under &quot;Live announcements&quot; on the portal home page immediately.
        Check &quot;Also post to Discord&quot; to mirror it to the event server through the same
        webhook that pings upcoming schedule events.
      </p>

      <section className="flex flex-col gap-5">
        <SectionHeader title="New announcement" />
        <AnnouncementComposer />
      </section>

      <section className="flex flex-col gap-5">
        <SectionHeader title="Recent" />
        <AnnouncementList announcements={announcements} />
      </section>
    </main>
  );
}
