import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getOrganization } from "@/actions/organization/getOrganization";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import SettingsOverview from "@/components/settings/SettingsOverview";
import { getCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/authz/requireRole";

import DangerZone from "./DangerZone";
import OrganizationForm from "./OrganizationForm";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await Promise.resolve(params);
  const [membership, org] = await Promise.all([
    requireRole(user.id, orgId, [Role.OWNER, Role.ADMIN]),
    getOrganization(orgId),
  ]);

  if (!org) redirect("/app");

  return (
    <>
      <PageHeader
        title="Organization Settings"
        description="Manage organization profile, controls, and destructive access."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/${orgId}/members`}>Members</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/app/${orgId}/audit-logs`}>
                Audit logs
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <section className="space-y-6">
        <SettingsOverview
          orgId={orgId}
          orgName={org.name}
          role={membership.role}
        />

        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <OrganizationForm orgId={orgId} initialName={org.name} userId={user.id} />

          <DangerZone
            orgId={orgId}
            isOwner={membership.role === Role.OWNER}
            userId={user.id}
          />
        </div>
      </section>
    </>
  );
}
