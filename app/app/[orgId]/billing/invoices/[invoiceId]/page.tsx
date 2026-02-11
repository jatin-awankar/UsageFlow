import { Role } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { InvoiceActions } from "./InvoiceActions";

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

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">Invoice</h1>
          <p className="text-sm text-gray-500">
            {invoice.periodStart.toDateString()} –{" "}
            {invoice.periodEnd.toDateString()}
          </p>
        </div>

        <span className="px-3 py-1 text-sm rounded bg-gray-100">
          {invoice.status}
        </span>
      </div>

      {/* Amount */}
      <div className="text-3xl font-bold">₹{invoice.amount}</div>

      {/* Breakdown */}
      <div className="border rounded-lg p-4 space-y-4 bg-white">
        <h2 className="font-medium">Usage breakdown</h2>

        {/* Base price */}
        <div className="flex justify-between">
          <span>Base plan ({plan.name})</span>
          <span>₹{plan.basePrice}</span>
        </div>

        <hr />

        {/* Metrics */}
        {usage.map((row) => {
          const pricing = plan.planMetrics.find(
            (pm) => pm.metric.key === row.metricKey
          );

          if (!pricing) return null;

          const overage = Math.max(0, row.total - pricing.includedUnits);

          const cost = overage * pricing.pricePerUnit;

          return (
            <div key={row.metricKey} className="space-y-1">
              <div className="font-medium">{row.metricKey}</div>
              <div className="text-sm text-gray-500">
                Used {row.total} · Included {pricing.includedUnits}
              </div>
              <div className="flex justify-between text-sm">
                <span>
                  Overage {overage} × ₹{pricing.pricePerUnit}
                </span>
                <span>₹{cost}</span>
              </div>
            </div>
          );
        })}

        <hr />

        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>₹{invoice.amount}</span>
        </div>
      </div>

      {/* Actions */}
      {invoice.status === "PENDING" && (
        <InvoiceActions userId={user.id} orgId={orgId} invoiceId={invoiceId} />
      )}
    </div>
  );
}
