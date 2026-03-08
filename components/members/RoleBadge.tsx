import { Role } from "@prisma/client";

const roleStyles: Record<Role, string> = {
  OWNER: "border-violet-200 bg-violet-50 text-violet-700",
  ADMIN: "border-sky-200 bg-sky-50 text-sky-700",
  DEVELOPER: "border-emerald-200 bg-emerald-50 text-emerald-700",
  VIEWER: "border-amber-200 bg-amber-50 text-amber-700",
};

function toTitleCase(role: Role) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleStyles[role]}`}
    >
      {toTitleCase(role)}
    </span>
  );
}
