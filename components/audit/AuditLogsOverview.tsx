import { Activity, CalendarClock, Layers3 } from "lucide-react";
import { ReactNode } from "react";

const numberFormatter = new Intl.NumberFormat("en-IN");
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function AuditLogsOverview({
  logs,
}: {
  logs: {
    id: string;
    createdAt: Date;
    entity: string;
  }[];
}) {
  const uniqueEntities = new Set(logs.map((log) => log.entity)).size;
  const latest = logs[0]
    ? dateFormatter.format(new Date(logs[0].createdAt))
    : "N/A";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-white via-sky-50/40 to-cyan-50/25 p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-700">
      <div className="pointer-events-none absolute -top-20 right-0 h-52 w-52 rounded-full bg-sky-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-8 h-60 w-60 rounded-full bg-cyan-300/15 blur-3xl" />

      <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <p className="mb-2 inline-flex items-center rounded-full border border-slate-300/80 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600">
            Security and compliance
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Organization audit trail
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Review operational changes made by organization admins across
            billing, metrics, plans, and credentials.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SnapshotTile
            title="Shown"
            value={numberFormatter.format(logs.length)}
            icon={<Activity className="size-4" />}
          />
          <SnapshotTile
            title="Entities"
            value={numberFormatter.format(uniqueEntities)}
            icon={<Layers3 className="size-4" />}
          />
          <SnapshotTile
            title="Latest"
            value={latest}
            icon={<CalendarClock className="size-4" />}
          />
        </div>
      </div>
    </section>
  );
}

function SnapshotTile({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
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
    </div>
  );
}
