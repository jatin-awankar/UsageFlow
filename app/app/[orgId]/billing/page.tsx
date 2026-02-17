import { getCostBreakdown } from "@/actions/analytics/getCostBreakdown";
import { getCurrentUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/authz/getMembership";
import { getActiveSubscription } from "@/lib/subscription/getActiveSubscription";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { CreditCard } from "lucide-react";
import { redirect } from "next/navigation";

import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { GenerateInvoiceButton } from "./GenerateInvoiceButton";

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

  const latestInvoice = await prisma.invoice.findFirst({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  const data = subscription
    ? await getCostBreakdown(user.id, orgId, subscription.id)
    : null;

  const canManageBilling =
    membership.role === Role.OWNER || membership.role === Role.ADMIN;

  return (
    <>
      <PageHeader
        title="Billing"
        description="Usage-based cost breakdown for the current billing period."
        actions={
          canManageBilling && subscription ? (
            <GenerateInvoiceButton
              userId={user.id}
              orgId={orgId}
              subscriptionId={subscription.id}
            />
          ) : undefined
        }
      />

      {!subscription ? (
        <EmptyState
          title="No active subscription"
          description="Select a plan to start tracking usage and billing."
          action={"Get Subscription"}
          icon={<CreditCard />}
          navigate={`/app/${orgId}/plans`}
        />
      ) : (
        <section className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              title="Base price"
              value={`₹${data?.basePrice}`}
              description="Fixed cost for the plan"
            />
            <SummaryCard
              title="Usage cost"
              value={`₹${data?.usageCost}`}
              description="Charges beyond included limits"
            />
            <SummaryCard
              title="Estimated total"
              value={`₹${data?.total}`}
              description="Projected invoice amount"
              highlight
            />
          </div>

          {latestInvoice && (
            <div className="rounded-lg border bg-white p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Latest invoice</p>
                <p className="font-medium text-gray-900">
                  ₹{latestInvoice.amount} · {latestInvoice.status}
                </p>
                <p className="text-xs text-gray-500">
                  {latestInvoice.periodStart.toDateString()} –{" "}
                  {latestInvoice.periodEnd.toDateString()}
                </p>
              </div>

              <a
                href={`/app/${orgId}/billing/invoices/${latestInvoice.id}`}
                className="text-sm font-medium text-black hover:underline"
              >
                View invoice →
              </a>
            </div>
          )}

          {/* Cost breakdown table */}
          <div className="overflow-hidden rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Metric
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">
                    Used
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">
                    Included
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">
                    Overage
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">
                    Price / unit
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">
                    Cost
                  </th>
                </tr>
              </thead>

              <tbody>
                {!data?.breakdown || data.breakdown.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-gray-500"
                    >
                      No usage recorded for this billing period
                    </td>
                  </tr>
                ) : (
                  data.breakdown.map((row) => (
                    <tr
                      key={`${row.metric}-${row.used}`}
                      className="border-b last:border-0"
                    >
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {row.metric}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        {row.used}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        {row.included}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        {row.overage}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        ₹{row.pricePerUnit}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">
                        ₹{row.cost}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <div className="text-sm text-gray-500 space-y-1">
            <p>• Overage is charged only when usage exceeds included units.</p>
            <p>• Final invoice may differ due to adjustments or discounts.</p>
          </div>
        </section>
      )}
    </>
  );
}

function SummaryCard({
  title,
  value,
  description,
  highlight = false,
}: {
  title: string;
  value: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight ? "bg-gray-50 border-gray-900" : "bg-white"
      }`}
    >
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  );
}
