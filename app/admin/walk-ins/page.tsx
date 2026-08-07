import { redirect } from "next/navigation";
import { AddWalkInForm } from "@/components/admin/AddWalkInForm";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";
import { canManageStaff, getRoleFromAppMetadata } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function AdminWalkInsPage() {
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

  return (
    <main className="mx-auto flex w-full max-w-290 flex-col gap-9 px-6 py-8 pb-20 sm:px-9">
      <SectionHeader title="Walk-ins" />
      <p className="max-w-155 font-body text-[14px] leading-relaxed text-base-800">
        For someone who turned up on the day without applying. Their email is all this needs -
        it creates the account, makes them a hacker, and files their RSVP, so they end up with
        exactly what an accepted applicant has. Their check-in URL comes back below: write it to
        a tag, or open it to check them into registration on the spot.
      </p>
      <p className="max-w-155 font-body text-[14px] leading-relaxed text-base-800">
        Tell them to sign in at <span className="font-mono text-[13px]">/portal/login</span> with
        this same email - they&apos;ll get a 6-digit code by email. Adding someone twice is safe;
        nobody is created or reset a second time.
      </p>

      <AddWalkInForm />
    </main>
  );
}
