// components/layout/Topbar.tsx
import { getCurrentUser } from "@/lib/auth/session";
import OrgSwitcher from "./OrgSwitcher";
import UserMenu from "./UserMenu";
import { getUserOrganizations } from "@/lib/org/getUserOrganizations";

type TopbarProps = {
  orgId: string;
  role: string;
  organizations: {
    id: string;
    name: string;
  }[];
};

export default async function Topbar({ orgId }: TopbarProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const orgs = await getUserOrganizations(user.id);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-8">
      {/* Left: reserved for page title */}
      <div id="page-title-slot" />

      {/* Right: org + user */}
      <div className="flex items-center gap-4">
        <OrgSwitcher currentOrgId={orgId} organizations={orgs} />
        <UserMenu email={user?.email || ""} orgId={orgId} />
      </div>
    </header>
  );
}
