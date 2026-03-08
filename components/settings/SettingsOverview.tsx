import { Role } from "@prisma/client";
import { Building2, Fingerprint, ShieldCheck, Sparkles } from "lucide-react";
import { ReactNode } from "react";

function toLabel(role: Role) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function compactId(value: string) {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export default function SettingsOverview({
  orgId,
  orgName,
  role,
}: {
  orgId: string;
  orgName: string;
  role: Role;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-slate-900 via-slate-800 to-sky-900 p-6 text-white shadow-lg shadow-slate-900/15 animate-in fade-in slide-in-from-top-2 duration-700">
      <div className="pointer-events-none absolute -top-20 right-0 h-52 w-52 rounded-full bg-sky-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-8 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <p className="mb-2 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100">
            Organization controls
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {orgName}
          </h2>
          <p className="mt-2 text-sm text-slate-200">
            Configure identity and governance controls for your workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile
            title="Access"
            value={toLabel(role)}
            icon={<ShieldCheck className="size-4" />}
          />
          <StatTile
            title="Org ID"
            value={compactId(orgId)}
            icon={<Fingerprint className="size-4" />}
          />
          <StatTile
            title="Profile"
            value="Active"
            helper="Editable metadata"
            icon={<Building2 className="size-4" />}
          />
        </div>
      </div>

      <div className="relative mt-4 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-slate-100">
        <p className="flex items-center gap-1.5 font-medium">
          <Sparkles className="size-3.5" />
          Changes here affect the entire organization workspace.
        </p>
      </div>
    </section>
  );
}

function StatTile({
  title,
  value,
  icon,
  helper,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  helper?: string;
}) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 p-3 shadow-sm backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5">
      <div className="mb-2 inline-flex rounded-md bg-white/15 p-2 text-white">
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-200">
        {title}
      </p>
      <p className="mt-1 truncate text-base font-semibold text-white">
        {value}
      </p>
      {helper ? <p className="mt-1 text-xs text-slate-300">{helper}</p> : null}
    </div>
  );
}
