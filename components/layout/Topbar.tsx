import React from "react";
import OrgSwitcher from "./OrgSwitcher";
import { getCurrentUser } from "@/lib/auth/session";

type TopbarProps = {
  orgId: string;
};

export default async function Topbar({ orgId }: TopbarProps) {
  const user = await getCurrentUser();

  return (
    <header className="h-14 border-b px-6 flex items-center justify-between">
      {/* Left */}
      <OrgSwitcher currentOrgId={orgId} />

      {/* Right */}
      <div className="text-sm text-gray-500">
        {user?.email}
      </div>
    </header>
  );
}
