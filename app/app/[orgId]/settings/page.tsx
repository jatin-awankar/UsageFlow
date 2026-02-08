import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authz/requireRole";
import { getOrganization } from "@/actions/organization/getOrganization";

import PageHeader from "@/components/layout/PageHeader";
import OrganizationForm from "./OrganizationForm";
import DangerZone from "./DangerZone";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await params;

  // 🔐 Get membership (and role)
  const membership = await requireRole(user.id, orgId, [
    Role.OWNER,
    Role.ADMIN,
  ]);
  console.log(membership);

  const org = await getOrganization(orgId);
  if (!org) redirect("/app");

  return (
    <>
      <PageHeader
        title="Organization Settings"
        description="Manage organization details and configuration."
      />

      <div className="space-y-8 max-w-2xl">
        <OrganizationForm
          orgId={orgId}
          initialName={org.name}
          userId={user.id}
        />

        {/* Only OWNER sees Danger Zone */}
        <DangerZone
          orgId={orgId}
          isOwner={membership.role === Role.OWNER}
          userId={user.id}
        />
      </div>
    </>
  );
}
