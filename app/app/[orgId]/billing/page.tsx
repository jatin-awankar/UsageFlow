import { getCostBreakdown } from "@/actions/analytics/getCostBreakdown";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveSubscription } from "@/lib/subscription/getActiveSubscription";
import { redirect } from "next/navigation";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const orgId = resolvedParams.orgId;

  const subscription = await getActiveSubscription(orgId);

  const data = subscription
    ? await getCostBreakdown(user.id, orgId, subscription.id)
    : null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-4">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Usage-based cost breakdown for the current billing period
        </p>
      </div>
      {!subscription ? (
        <p className="text-gray-500">
          This organization does not have an active subscription.
        </p>
      ) : (
        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              title="Base Price"
              value={`₹${data?.basePrice}`}
              description="Fixed cost for the plan"
            />
            <SummaryCard
              title="Usage Cost"
              value={`₹${data?.usageCost}`}
              description="Charges for usage beyond included limits"
            />
            <SummaryCard
              title="Total Amount"
              value={`₹${data?.total}`}
              description="Estimated invoice total"
              highlight
            />
          </div>

          {/* ---------- Cost Breakdown Table ---------- */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left">Metric</th>
                  <th className="p-3 text-right">Used</th>
                  <th className="p-3 text-right">Included</th>
                  <th className="p-3 text-right">Overage</th>
                  <th className="p-3 text-right">Price / Unit</th>
                  <th className="p-3 text-right">Cost</th>
                </tr>
              </thead>

              <tbody>
                {data?.breakdown.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-4 text-center text-muted-foreground"
                    >
                      No usage recorded for this billing period
                    </td>
                  </tr>
                ) : (
                  data?.breakdown.map((row) => (
                    <tr key={`${row.metric}-${row.used}`} className="border-t">
                      <td className="p-3 font-medium">{row.metric}</td>
                      <td className="p-3 text-right">{row.used}</td>
                      <td className="p-3 text-right">{row.included}</td>
                      <td className="p-3 text-right">{row.overage}</td>
                      <td className="p-3 text-right">₹{row.pricePerUnit}</td>
                      <td className="p-3 text-right font-medium">
                        ₹{row.cost}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>• Overage is charged only when usage exceeds included units.</p>
        <p>• Final invoice may differ due to adjustments or discounts.</p>
      </div>
    </div>
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
      className={`border rounded-lg p-4 ${highlight ? "bg-primary/5 border-primary" : ""
        }`}
    >
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
