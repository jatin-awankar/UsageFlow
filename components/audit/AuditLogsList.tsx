import { Clock3, Database } from "lucide-react";

type AuditLogItem = {
  id: string;
  action: string;
  entity: string;
  metadata: unknown;
  createdAt: Date;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function toLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function metadataPreview(metadata: unknown) {
  if (!metadata) return "-";

  try {
    return JSON.stringify(metadata);
  } catch {
    return "[unserializable metadata]";
  }
}

function actionTone(action: string) {
  const value = action.toLowerCase();

  if (value.includes("delete") || value.includes("revoke") || value.includes("failed")) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (value.includes("create") || value.includes("activate") || value.includes("paid")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (value.includes("update") || value.includes("toggle")) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function AuditLogsList({ logs }: { logs: AuditLogItem[] }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:120ms]">
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Entries</h3>
          <p className="text-sm text-slate-500">
            Time-ordered events captured for this organization
          </p>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {logs.map((log, index) => {
          const metadata = metadataPreview(log.metadata);

          return (
            <article
              key={log.id}
              className="rounded-xl border border-slate-200/70 bg-slate-50/75 p-3 animate-in fade-in slide-in-from-left-2"
              style={{
                animationDuration: "650ms",
                animationDelay: `${index * 55}ms`,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-medium text-slate-900">
                  {toLabel(log.action)}
                </p>
                <span
                  className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${actionTone(log.action)}`}
                >
                  {toLabel(log.entity)}
                </span>
              </div>

              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Clock3 className="size-3.5" />
                {dateFormatter.format(new Date(log.createdAt))}
              </p>

              <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2 py-1">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Metadata
                </p>
                <code className="block max-h-24 overflow-auto text-xs text-slate-700">
                  {metadata}
                </code>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden rounded-xl border border-slate-200 md:block">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="w-[22%] px-4 py-3 text-left font-medium text-slate-600">
                  Time
                </th>
                <th className="w-[20%] px-4 py-3 text-left font-medium text-slate-600">
                  Action
                </th>
                <th className="w-[18%] px-4 py-3 text-left font-medium text-slate-600">
                  Entity
                </th>
                <th className="w-[40%] px-4 py-3 text-left font-medium text-slate-600">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr
                  key={log.id}
                  className="border-b border-slate-200/80 last:border-0 animate-in fade-in"
                  style={{
                    animationDuration: "650ms",
                    animationDelay: `${index * 38}ms`,
                  }}
                >
                  <td className="px-4 py-3 text-slate-700">
                    {dateFormatter.format(new Date(log.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">{toLabel(log.action)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${actionTone(log.action)}`}
                    >
                      {toLabel(log.entity)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
                      <p className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <Database className="size-3" />
                        Metadata
                      </p>
                      <code className="block max-h-14 overflow-auto font-mono text-xs text-slate-700">
                        {metadataPreview(log.metadata)}
                      </code>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
