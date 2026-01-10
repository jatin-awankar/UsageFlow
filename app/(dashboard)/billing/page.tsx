import { getCostBreakdown } from "@/app/actions/analytics/getCostBreakdown";
import { getCurrentUser } from "@/lib/auth";

/**
 * BillingPage
 * ------------
 * Server-rendered dashboard page that shows
 * usage-based billing breakdown for the ACTIVE subscription.
 *
 * Performance characteristics:
 * - Server Component (no client fetch)
 * - Single backend call
 * - Uses aggregated_usage only
 * - No trust in UI for billing context
 */
export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const orgId = user.currentOrgId;

  // Parallel-ready pattern (easy to extend later)
  const [billing] = await Promise.all([
    getCostBreakdown(user.id, orgId),
  ]);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Usage-based cost breakdown for the current billing period
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          title="Base Price"
          value={`₹${billing.basePrice}`}
          description="Fixed cost for the plan"
        />

        <SummaryCard
          title="Usage Cost"
          value={`₹${billing.usageCost}`}
          description="Charges for usage beyond included limits"
        />

        <SummaryCard
          title="Total Amount"
          value={`₹${billing.total}`}
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
            {billing.breakdown.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-4 text-center text-muted-foreground"
                >
                  No usage recorded for this billing period
                </td>
              </tr>
            ) : (
              billing.breakdown.map((row) => (
                <tr
                  key={`${row.metric}-${row.used}`}
                  className="border-t"
                >
                  <td className="p-3 font-medium">{row.metric}</td>
                  <td className="p-3 text-right">{row.used}</td>
                  <td className="p-3 text-right">{row.included}</td>
                  <td className="p-3 text-right">{row.overage}</td>
                  <td className="p-3 text-right">
                    ₹{row.pricePerUnit}
                  </td>
                  <td className="p-3 text-right font-medium">
                    ₹{row.cost}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
      className={`border rounded-lg p-4 ${
        highlight ? "bg-primary/5 border-primary" : ""
      }`}
    >
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {description}
      </p>
    </div>
  );
}
