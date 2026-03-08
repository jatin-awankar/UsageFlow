import Link from "next/link";
import { Compass, Home } from "lucide-react";
import OrgSwitcher from "./OrgSwitcher";
import UserMenu from "./UserMenu";
import { cn } from "@/lib/utils";

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
  const currentOrgName =
    organizations.find((org) => org.id === orgId)?.name || "Organization";

  const roleColor: Record<TopbarProps["role"], string> = {
    OWNER: "border-violet-200 bg-violet-50 text-violet-700",
    ADMIN: "border-sky-200 bg-sky-50 text-sky-700",
    DEVELOPER: "border-emerald-200 bg-emerald-50 text-emerald-700",
    VIEWER: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-5 lg:px-7">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Workspace
          </p>
          <p className="truncate text-sm font-medium text-slate-900">
            {currentOrgName}
          </p>
        </div>

        <div className="hidden min-w-0 max-w-sm flex-1 lg:block">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left text-sm text-slate-500 shadow-sm transition hover:bg-slate-50"
          >
            <span className="truncate">
              Search modules, invoices, metrics...
            </span>
            <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              Ctrl K
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-1.5 md:flex">
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <Home className="size-3.5" />
              Home
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <Compass className="size-3.5" />
              Docs
            </Link>
          </div>

          <span
            className={cn(
              "hidden rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex",
              roleColor[role],
            )}
          >
            {roleLabel(role)}
          </span>
          <OrgSwitcher currentOrgId={orgId} organizations={organizations} />
          <UserMenu email={userEmail} orgId={orgId} role={role} />
        </div>
      </div>
    </header>
  );
}
