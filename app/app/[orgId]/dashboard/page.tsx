// app/[orgId]/dashboard/page.tsx
import { Role } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/authz/requireRole";
import { redirect } from "next/navigation";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Await params if it's a Promise (Next.js 16+)
  const resolvedParams = await Promise.resolve(params);
  const orgId = resolvedParams.orgId;

  if (!orgId) {
    redirect("/app");
  }

  // 🔐 Ensure user belongs to this org
  const membership = await requireRole(user.id, orgId, [
    Role.OWNER,
    Role.ADMIN,
    Role.DEVELOPER,
    Role.VIEWER,
  ]);

  if (!membership || ("ok" in membership && !membership.ok)) {
    redirect("/app");
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Organization ID: {orgId}
      </p>
    </div>
  );
}
