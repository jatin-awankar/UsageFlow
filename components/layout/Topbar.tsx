import React from "react";
import OrgSwitcher from "./OrgSwitcher";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganization } from "@/actions/organization/getOrganization";

type TopbarProps = {
  orgId: string;
};

export default async function Topbar({ orgId }: TopbarProps) {
  const user = await getCurrentUser();

  const orgName = await getOrganization(orgId)

  return (
    <header className="h-14 border-b px-6 flex items-center justify-between">
      {/* Left */}
      <OrgSwitcher currentOrg={orgName?.name || "Organization name not specified"} />

      {/* Right */}
      <div className="text-sm text-gray-500">
        {user?.email}
      </div>
    </header>
  );
}
