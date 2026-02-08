import { Role } from "@prisma/client";

export function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    OWNER: "bg-purple-100 text-purple-700",
    ADMIN: "bg-blue-100 text-blue-700",
    DEVELOPER: "bg-gray-100 text-gray-700",
    VIEWER: "bg-yellow-100 text-yellow-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[role]}`}
    >
      {role}
    </span>
  );
}
