import type { UserRole } from "@/lib/auth/roles";

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  hacker: "bg-orange text-white",
  volunteer: "bg-blue text-white",
  organizer: "bg-purple text-white",
  user: "bg-black/10 text-base-800",
};

const ROLE_LABEL: Record<UserRole, string> = {
  hacker: "Hacker",
  volunteer: "Volunteer",
  organizer: "Organizer",
  user: "User",
};

export function UserRoleBadge({ role }: Readonly<{ role: UserRole }>) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-pill px-2 py-0.5 font-display text-[10px] font-semibold uppercase tracking-wide ${ROLE_BADGE_CLASS[role]}`}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}
