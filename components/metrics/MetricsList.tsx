import Link from "next/link";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MetricsList({
  orgId,
  metrics,
  page,
  pageSize,
}: {
  orgId: string;
  metrics: {
    id: string;
    name: string;
    key: string;
    unit: string;
  }[];
  page: number;
  pageSize: number;
}) {
  const hasPrev = page > 0;
  const hasNext = metrics.length >= pageSize;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-md shadow-slate-900/5 animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:120ms]">
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Metric catalog</h3>
          <p className="text-sm text-slate-500">
            Keys consumed by event ingestion and billing rules
          </p>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {metrics.map((metric, index) => (
          <article
            key={metric.id}
            className="rounded-xl border border-slate-200/70 bg-slate-50/85 p-3 animate-in fade-in slide-in-from-left-2"
            style={{
              animationDuration: "650ms",
              animationDelay: `${index * 65}ms`,
            }}
          >
            <p className="text-sm font-medium text-slate-900">{metric.name}</p>
            <p className="mt-1 inline-flex rounded-md border border-slate-300 bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
              {metric.key}
            </p>
            <p className="mt-2 text-xs text-slate-500">Unit: {metric.unit}</p>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Key
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Unit
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, index) => (
              <tr
                key={metric.id}
                className="border-b border-slate-200/80 last:border-0 animate-in fade-in"
                style={{
                  animationDuration: "650ms",
                  animationDelay: `${index * 45}ms`,
                }}
              >
                <td className="px-4 py-3 font-medium text-slate-900">
                  {metric.name}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-md border border-slate-300 bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                    {metric.key}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{metric.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Link
          href={`/app/${orgId}/metrics?page=${Math.max(page - 1, 0)}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors",
            hasPrev
              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              : "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
          )}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Link>

        <Link
          href={`/app/${orgId}/metrics?page=${page + 1}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors",
            hasNext
              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              : "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
          )}
        >
          Next
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
