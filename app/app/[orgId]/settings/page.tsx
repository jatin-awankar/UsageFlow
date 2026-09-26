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
import { setCurrency } from "@/actions/organization/setCurrency";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
  searchParams: Promise<{ currencyError?: string; currencySaved?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await Promise.resolve(params);
  const [membership, org] = await Promise.all([
    requireRole(user.id, orgId, [Role.OWNER, Role.ADMIN]),
    getOrganization(orgId),
  ]);

  if (!org) redirect("/app");
  const { currencyError, currencySaved } = await searchParams;

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
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Billing currency</h2>
          <p className="mb-3 text-sm text-slate-600">Current currency: {org.currency ?? "Not set"}. Legacy Plan prices do not determine this currency.</p>
          {membership.role === Role.OWNER && (
            <form action={setCurrency.bind(null, orgId)} className="flex items-end gap-3">
              <div>
                <label htmlFor="currency" className="block text-sm">ISO 4217 currency</label>
                <input id="currency" name="currency" maxLength={3} required placeholder="USD" className="rounded border px-3 py-2 uppercase" />
              </div>
              <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">Set currency</button>
            </form>
          )}
          {currencyError === "invalid" && <p role="alert">Enter a valid uppercase ISO 4217 currency.</p>}
          {currencyError === "locked" && <p role="alert">Published pricing locks this Organization's currency.</p>}
          {currencySaved === "1" && <p role="status">Currency saved.</p>}
        </div>
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
