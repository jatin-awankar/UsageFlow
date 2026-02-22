import { Activity, BellRing, Radio } from "lucide-react";
import { ReactNode } from "react";

const numberFormatter = new Intl.NumberFormat("en-IN");
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function WebhooksOverview({
  webhooks,
}: {
  webhooks: {
    id: string;
    active: boolean;
    events: string[];
    createdAt: Date;
  }[];
}) {
  const activeCount = webhooks.filter((webhook) => webhook.active).length;
  const totalEvents = new Set(webhooks.flatMap((webhook) => webhook.events))
    .size;
  const latest = webhooks[0]
    ? dateFormatter.format(new Date(webhooks[0].createdAt))
    : "N/A";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-white via-sky-50/40 to-cyan-50/30 p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-700">
      <div className="pointer-events-none absolute -top-20 right-0 h-52 w-52 rounded-full bg-sky-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-8 h-60 w-60 rounded-full bg-cyan-300/15 blur-3xl" />

      <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <p className="mb-2 inline-flex items-center rounded-full border border-slate-300/80 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600">
            Event delivery
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Webhook endpoints
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Dispatch product and billing events to your backend consumers in
            near real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SnapshotTile
            title="Endpoints"
            value={numberFormatter.format(webhooks.length)}
            icon={<Radio className="size-4" />}
          />
          <SnapshotTile
            title="Active"
            value={numberFormatter.format(activeCount)}
            icon={<Activity className="size-4" />}
          />
          <SnapshotTile
            title="Latest"
            value={latest}
            helper={`${numberFormatter.format(totalEvents)} event types`}
            icon={<BellRing className="size-4" />}
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
