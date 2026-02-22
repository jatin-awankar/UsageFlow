import { WebhookDeliveryStatusBadge } from "@/components/webhooks/WebhookStatusBadges";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function toSentenceCase(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function WebhookLogsList({
  logs,
}: {
  logs: {
    id: string;
    status: string;
    createdAt: Date;
    responseCode: number | null;
    attempt: number;
    durationMs: number | null;
    webhookEvent: { type: string };
    endpoint: { url: string };
  }[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:120ms]">
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Delivery log
          </h3>
          <p className="text-sm text-slate-500">
            Most recent attempts across all endpoints
          </p>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {logs.map((log, index) => (
          <article
            key={log.id}
            className="rounded-xl border border-slate-200/70 bg-slate-50/75 p-3 animate-in fade-in slide-in-from-left-2"
            style={{
              animationDuration: "650ms",
              animationDelay: `${index * 60}ms`,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {toSentenceCase(log.webhookEvent.type)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {dateFormatter.format(new Date(log.createdAt))}
                </p>
              </div>
              <WebhookDeliveryStatusBadge status={log.status} />
            </div>
            <div className="mt-2 max-w-full overflow-x-auto rounded bg-slate-100 px-2 py-1">
              <code className="whitespace-nowrap text-xs text-slate-700">
                {log.endpoint.url}
              </code>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Attempt {log.attempt}
              {log.responseCode ? ` - HTTP ${log.responseCode}` : ""}
              {typeof log.durationMs === "number"
                ? ` - ${log.durationMs} ms`
                : ""}
            </p>
          </article>
        ))}
      </div>

      <div className="hidden rounded-xl border border-slate-200 md:block">
        <div className="overflow-x-auto">
        <table className="min-w-[1020px] w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="w-[21%] px-4 py-3 text-left font-medium text-slate-600">
                Time
              </th>
              <th className="w-[19%] px-4 py-3 text-left font-medium text-slate-600">
                Event
              </th>
              <th className="w-[30%] px-4 py-3 text-left font-medium text-slate-600">
                Endpoint
              </th>
              <th className="w-[14%] px-4 py-3 text-left font-medium text-slate-600">
                Status
              </th>
              <th className="w-[16%] px-4 py-3 text-left font-medium text-slate-600">
                Response
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
                  animationDelay: `${index * 40}ms`,
                }}
              >
                <td className="px-4 py-3 text-slate-700">
                  {dateFormatter.format(new Date(log.createdAt))}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-800">
                  {log.webhookEvent.type}
                </td>
                <td className="px-4 py-3">
                  <div className="max-w-full truncate font-mono text-xs text-slate-600">
                    {log.endpoint.url}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <WebhookDeliveryStatusBadge status={log.status} />
                </td>
                <td className="px-4 py-3 text-slate-700">
                  Attempt {log.attempt}
                  {log.responseCode ? ` - HTTP ${log.responseCode}` : ""}
                  {typeof log.durationMs === "number"
                    ? ` - ${log.durationMs} ms`
                    : ""}
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
