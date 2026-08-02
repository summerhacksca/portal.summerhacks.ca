import { redirect } from "next/navigation";
import { AddStaffForm } from "@/components/admin/AddStaffForm";
import { StaffRoleList } from "@/components/admin/StaffRoleList";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { canManageStaff, getRoleFromAppMetadata, isSuperadmin } from "@/lib/auth/roles";
import { getStaffDirectory } from "@/lib/portal/queries";
import { createClient } from "@/lib/supabase/server";

export default async function AdminStaffPage() {
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

  const directory = await getStaffDirectory();
  const staff = directory.filter((person) => person.role !== "hacker" && person.role !== "user");
  const hackers = directory.filter((person) => person.role === "hacker");

  return (
    <main className="mx-auto flex w-full max-w-290 flex-col gap-9 px-6 py-8 pb-20 sm:px-9">
      <SectionHeader
        title="Staff"
        trailing={
          <span className="font-mono text-[11px] text-sun-400">
            {staff.length} {staff.length === 1 ? "staff member" : "staff members"}
          </span>
        }
      />
      <p className="max-w-155 font-body text-[14px] leading-relaxed text-base-800">
        Organizers can promote hackers to volunteer and move people between user, hacker and
        volunteer. Organizer rows are read-only here - only a superadmin can grant or revoke
        organizer, and superadmin itself is only ever set by hand in the database.
      </p>

      <section className="flex flex-col gap-5">
        <SectionHeader title="Add staff" />
        <AddStaffForm canAddOrganizer={isSuperadmin(viewerRole)} />
      </section>

      <section className="flex flex-col gap-5">
        <SectionHeader title="Volunteers & organizers" />
        <StaffRoleList people={staff} viewerRole={viewerRole} viewerId={user.id} />
      </section>

      <section className="flex flex-col gap-5">
        <SectionHeader
          title="Hackers"
          trailing={
            <span className="font-mono text-[11px] text-sun-400">
              {hackers.length} {hackers.length === 1 ? "hacker" : "hackers"}
            </span>
          }
        />
        <StaffRoleList people={hackers} viewerRole={viewerRole} viewerId={user.id} />
      </section>
    </main>
  );
}
