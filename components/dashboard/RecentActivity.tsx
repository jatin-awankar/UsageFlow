const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function toSentenceCase(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function RecentActivity({
  logs,
}: {
  logs: {
    id: string;
    action: string;
    createdAt: Date;
  }[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:300ms]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Recent activity</h3>
          <p className="text-sm text-slate-500">Latest organization events</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {logs.length} events
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 text-center text-sm text-slate-500">
          No recent activity.
        </div>
      ) : (
        <ol className="space-y-3">
          {logs.map((log, index) => (
            <li
              key={log.id}
              className="relative rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 pl-4 animate-in fade-in slide-in-from-right-2"
              style={{
                animationDuration: "650ms",
                animationDelay: `${index * 80}ms`,
              }}
            >
              <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-gradient-to-b from-sky-500 to-cyan-400" />
              <p className="pr-24 text-sm font-medium text-slate-800">
                {toSentenceCase(log.action)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {dateTimeFormatter.format(new Date(log.createdAt))}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
