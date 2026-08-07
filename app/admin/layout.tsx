import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AdminHeader } from "@/components/admin/AdminHeader";
import type { Metadata } from "next";
import { TermsAcceptance } from "@/components/legal/TermsAcceptance";
import { canManageStaff, getRoleFromAppMetadata } from "@/lib/auth/roles";
import { hasAcceptedCurrentTerms } from "@/lib/portal/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Staff · SummerHacks",
  description: "Check-in and tag provisioning for volunteers and organizers",
};

export const dynamic = "force-dynamic";

/**
 * Staff-only shell. Access is enforced in proxy.ts (`canAccessAdmin`) and again
 * by the `can_access_admin()` RLS policies, so there is no auth check here -
 * the one read below is just to decide whether to render the organizer-only
 * nav links, not a gate. /admin/trek, /admin/staff and /admin/announcements
 * re-check and redirect on their own if a volunteer reaches them directly.
 *
 * Staff are bound by the Terms of Use too (it covers "mentors, judges, sponsors,
 * volunteers, and staff"), so an organizer landing straight on /admin gets the
 * same blocking re-consent screen as a hacker landing on /portal - see
 * app/portal/layout.tsx for why this replaces {children} rather than
 * overlaying it.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canSeeOrganizerLinks = user
    ? canManageStaff(getRoleFromAppMetadata(user.app_metadata))
    : false;
  const gated = Boolean(user) && !(await hasAcceptedCurrentTerms());

  return (
    <div className="flex min-h-screen flex-col bg-surface-page">
      <AdminHeader canSeeOrganizerLinks={canSeeOrganizerLinks} />
      {gated ? (
        <TermsAcceptance />
      ) : (
        <>
          <div className="mx-auto w-full max-w-290 px-6 sm:px-9">
            <AdminBreadcrumb />
          </div>
          {children}
        </>
      )}
    </div>
  );
}
