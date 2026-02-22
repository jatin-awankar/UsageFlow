import OrgSwitcher from "./OrgSwitcher";
import UserMenu from "./UserMenu";

type TopbarProps = {
  orgId: string;
  role: "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER";
  userEmail: string;
  organizations: {
    id: string;
    name: string;
  }[];
};

function roleLabel(role: TopbarProps["role"]) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export default function Topbar({
  orgId,
  role,
  userEmail,
  organizations,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Workspace
          </p>
          <p className="truncate text-sm font-medium text-slate-900">
            {organizations.find((org) => org.id === orgId)?.name || "Organization"}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
            {roleLabel(role)}
          </span>
          <OrgSwitcher currentOrgId={orgId} organizations={organizations} />
          <UserMenu email={userEmail} orgId={orgId} />
        </div>
      </div>
    </header>
  );
}
