import { getCurrentUser } from "@/lib/auth/session";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/layout/PageHeader";
import InvoiceStatusBadge from "@/components/invoices/InvoiceStatusBadge";
import InvoiceBreakdown from "@/components/invoices/InvoiceBreakdown";
import { InvoiceActions } from "./InvoiceActions";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-IN");

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function InvoiceDetailPage({
  params,
}: {
  params:
    | Promise<{ orgId: string; invoiceId: string }>
    | { orgId: string; invoiceId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId, invoiceId } = await Promise.resolve(params);

  if (!orgId || !invoiceId) {
    redirect("/app");
  }

  const membership = await requireRole(user.id, orgId, [
    Role.OWNER,
    Role.ADMIN,
    Role.DEVELOPER,
    Role.VIEWER,
  ]);

  if (!membership || ("ok" in membership && !membership.ok)) {
    redirect("/app");
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      subscription: {
        include: {
          plan: {
            include: {
              planMetrics: { include: { metric: true } },
            },
          },
        },
      },
    },
  });

  if (!invoice || invoice.orgId !== orgId) {
    redirect(`/app/${orgId}/billing`);
  }

  const usage = await prisma.aggregatedUsage.findMany({
    where: {
      subscriptionId: invoice.subscriptionId,
      periodStart: invoice.periodStart,
    },
  });

  const plan = invoice.subscription.plan;

  const breakdownRows = usage
    .map((row) => {
      const pricing = plan.planMetrics.find(
        (pm) => pm.metric.key === row.metricKey,
      );
      if (!pricing) return null;

      const overage = Math.max(0, row.total - pricing.includedUnits);
      const cost = overage * pricing.pricePerUnit;

      return {
        metric: row.metricKey,
        used: row.total,
        included: pricing.includedUnits,
        overage,
        pricePerUnit: pricing.pricePerUnit,
        cost,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const totalUsage = breakdownRows.reduce((sum, row) => sum + row.used, 0);

  return (
    <>
      <PageHeader
        title="Invoice Details"
        description="Detailed cost composition and status for this finalized billing document."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/${orgId}/billing/invoices`}>
                <ArrowLeft className="size-4" />
                All invoices
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/app/${orgId}/billing`}>
                Billing overview
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <section className="space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-slate-900 via-slate-800 to-sky-900 p-6 text-white shadow-lg shadow-slate-900/15 animate-in fade-in slide-in-from-top-2 duration-700">
          <div className="pointer-events-none absolute -top-16 right-0 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <div>
              <p className="mb-2 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100">
                <ReceiptText className="mr-1.5 size-3.5" />
                Invoice #{invoice.id.slice(0, 8)}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {currencyFormatter.format(invoice.amount)}
              </h2>
              <p className="mt-2 text-sm text-slate-200">
                {dateFormatter.format(invoice.periodStart)} to{" "}
                {dateFormatter.format(invoice.periodEnd)}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SummaryTile
                title="Status"
                value={<InvoiceStatusBadge status={invoice.status} />}
                icon={<CalendarRange className="size-4" />}
              />
              <SummaryTile
                title="Plan"
                value={
                  <span className="text-sm font-semibold text-white">
                    {plan.name}
                  </span>
                }
                icon={<Wallet className="size-4" />}
              />
              <SummaryTile
                title="Usage Units"
                value={
                  <span className="text-sm font-semibold text-white">
                    {numberFormatter.format(totalUsage)}
                  </span>
                }
                icon={<ReceiptText className="size-4" />}
              />
            </div>
          </div>
        </section>

        <InvoiceBreakdown
          planName={plan.name}
          basePrice={plan.basePrice}
          invoiceAmount={invoice.amount}
          rows={breakdownRows}
        />

        {invoice.status === "PENDING" ? (
          <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:220ms]">
            <h3 className="text-base font-semibold text-slate-900">
              Invoice actions
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Update invoice settlement state. These actions are restricted to
              owners and admins.
            </p>
            <div className="mt-4">
              <InvoiceActions
                userId={user.id}
                orgId={orgId}
                invoiceId={invoiceId}
              />
            </div>
          </section>
        ) : null}
      </section>
    </>
  );
}

function SummaryTile({
  title,
  value,
  icon,
}: {
  title: string;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 p-3 shadow-sm backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5">
      <div className="mb-2 inline-flex rounded-md bg-white/15 p-2 text-white">
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-200">
        {title}
      </p>
      <div className="mt-1">{value}</div>
    </div>
  );
}
