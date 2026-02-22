import { Building2, Compass, Sparkles } from "lucide-react";
import { ReactNode } from "react";

const numberFormatter = new Intl.NumberFormat("en-IN");

export default function AppHomeHero({
  email,
  organizationCount,
}: {
  email: string;
  organizationCount: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-white via-sky-50/35 to-cyan-50/30 p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-700">
      <div className="pointer-events-none absolute -top-20 right-0 h-56 w-56 rounded-full bg-sky-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-6 h-56 w-56 rounded-full bg-cyan-300/15 blur-3xl" />

      <div className="relative grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <div>
          <p className="mb-2 inline-flex items-center rounded-full border border-slate-300/80 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600">
            Workspace hub
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Pick an organization to continue managing billing, usage analytics,
            and developer integrations.
          </p>
          <p className="mt-1 text-xs text-slate-500">Signed in as {email}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricTile
            title="Organizations"
            value={numberFormatter.format(organizationCount)}
            icon={<Building2 className="size-4" />}
          />
          <MetricTile
            title="Focus"
            value="Operations"
            icon={<Compass className="size-4" />}
          />
          <MetricTile
            title="Status"
            value="Ready"
            helper="All modules available"
            icon={<Sparkles className="size-4" />}
          />
        </div>
      </div>
    </section>
  );
}

function MetricTile({
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
    <div className="rounded-xl border border-slate-200/80 bg-white/85 p-3 shadow-sm backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5">
      <div className="mb-2 inline-flex rounded-md bg-slate-100 p-2 text-slate-600">
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}
