import { getCostBreakdown } from "@/actions/analytics/getCostBreakdown";
import { getCurrentUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/authz/getMembership";
import { getActiveSubscription } from "@/lib/subscription/getActiveSubscription";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import BillingEmptyState from "@/components/billing/BillingEmptyState";
import BillingSummaryCards from "@/components/billing/BillingSummaryCards";
import LatestInvoiceCard from "@/components/billing/LatestInvoiceCard";
import BillingBreakdown from "@/components/billing/BillingBreakdown";
import { GenerateInvoiceButton } from "./GenerateInvoiceButton";
import { ArrowRight } from "lucide-react";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await Promise.resolve(params);
  const [subscription, membership] = await Promise.all([
    getActiveSubscription(orgId),
    getMembership(user.id, orgId),
  ]);

  if (!membership) redirect("/app");

  const [latestInvoice, data] = await Promise.all([
    prisma.invoice.findFirst({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    }),
    subscription ? getCostBreakdown(user.id, orgId, subscription.id) : null,
  ]);

  const canManageBilling =
    membership.role === Role.OWNER || membership.role === Role.ADMIN;

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const cycleRange =
    subscription === null
      ? null
      : `${dateFormatter.format(subscription.periodStart)} to ${
          subscription.periodEnd
            ? dateFormatter.format(subscription.periodEnd)
            : "Current"
        }`;

  return (
    <>
      <PageHeader
        title="Billing"
        description="Track projected invoice totals, overages, and metric-level cost contributors."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/${orgId}/billing/invoices`}>View invoices</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/app/${orgId}/analytics`}>
                Usage analytics
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            {canManageBilling && subscription ? (
              <GenerateInvoiceButton
                userId={user.id}
                orgId={orgId}
                subscriptionId={subscription.id}
              />
            ) : null}
          </div>
        }
      />

      {!subscription ? (
        <BillingEmptyState orgId={orgId} />
      ) : (
        <section className="space-y-6">
          <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-slate-900 via-slate-800 to-sky-900 p-6 text-white shadow-lg shadow-slate-900/15 animate-in fade-in slide-in-from-top-2 duration-700">
            <div className="pointer-events-none absolute -top-16 right-0 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl" />

            <div className="relative flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="mb-2 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100">
                  Current billing cycle
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {cycleRange}
                </h2>
                <p className="mt-2 text-sm text-slate-200">
                  Review your spend trajectory before invoices are finalized.
                </p>
              </div>
            </div>
          </section>

          <BillingSummaryCards
            basePrice={data?.basePrice ?? 0}
            usageCost={data?.usageCost ?? 0}
            total={data?.total ?? 0}
          />

          {latestInvoice ? (
            <LatestInvoiceCard invoice={latestInvoice} orgId={orgId} />
          ) : null}

          <BillingBreakdown rows={data?.breakdown ?? []} />
        </section>
      )}
    </>
  );
}
