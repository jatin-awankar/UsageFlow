import Link from "next/link";
import { ArrowRight } from "lucide-react";
import InvoiceStatusBadge from "@/components/invoices/InvoiceStatusBadge";

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

export default function InvoicesList({
  orgId,
  invoices,
}: {
  orgId: string;
  invoices: {
    id: string;
    amount: number;
    status: string;
    periodStart: Date;
    periodEnd: Date;
    createdAt: Date;
  }[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:120ms]">
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">All invoices</h3>
          <p className="text-sm text-slate-500">
            Ordered by most recent billing cycle
          </p>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {invoices.map((invoice, index) => (
          <article
            key={invoice.id}
            className="rounded-xl border border-slate-200/70 bg-slate-50/75 p-3 animate-in fade-in slide-in-from-left-2"
            style={{
              animationDuration: "650ms",
              animationDelay: `${index * 65}ms`,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {dateFormatter.format(invoice.periodStart)} -{" "}
                  {dateFormatter.format(invoice.periodEnd)}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {currencyFormatter.format(invoice.amount)}
                </p>
              </div>
              <InvoiceStatusBadge status={invoice.status} />
            </div>

            <Link
              href={`/app/${orgId}/billing/invoices/${invoice.id}`}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              View details
              <ArrowRight className="size-4" />
            </Link>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Period
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">
                Amount
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Status
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice, index) => (
              <tr
                key={invoice.id}
                className="border-b border-slate-200/80 last:border-0 animate-in fade-in"
                style={{
                  animationDuration: "650ms",
                  animationDelay: `${index * 45}ms`,
                }}
              >
                <td className="px-4 py-3 text-slate-800">
                  {dateFormatter.format(invoice.periodStart)} -{" "}
                  {dateFormatter.format(invoice.periodEnd)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                  {currencyFormatter.format(invoice.amount)}
                </td>
                <td className="px-4 py-3">
                  <InvoiceStatusBadge status={invoice.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/app/${orgId}/billing/invoices/${invoice.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
                  >
                    View
                    <ArrowRight className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
