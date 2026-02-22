import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatStatus(status: string) {
  return status.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status: string) {
  if (status === "PAID") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "FAILED") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function LatestInvoiceCard({
  invoice,
  orgId,
}: {
  invoice: {
    id: string;
    amount: number;
    status: string;
    periodStart: Date;
    periodEnd: Date;
    createdAt: Date;
  };
  orgId: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:120ms]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            <FileText className="size-3.5" />
            Latest invoice
          </p>
          <p className="text-xl font-semibold tracking-tight text-slate-900">
            {currencyFormatter.format(invoice.amount)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {dateFormatter.format(invoice.periodStart)} -{" "}
            {dateFormatter.format(invoice.periodEnd)}
          </p>
        </div>

        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs font-medium",
            statusClass(invoice.status)
          )}
        >
          {formatStatus(invoice.status)}
        </span>
      </div>

      <div className="mt-4 border-t border-slate-200/80 pt-3">
        <Link
          href={`/app/${orgId}/billing/invoices/${invoice.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
        >
          View invoice details
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
