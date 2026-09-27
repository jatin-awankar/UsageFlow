import prisma from "@/lib/prisma";

export function utcMonth(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  if (start.getUTCFullYear() !== year) return null;
  return { start, end: new Date(Date.UTC(year, month, 1)) };
}

export async function getLegacyExclusionReport(orgId: string, month: string) {
  const period = utcMonth(month);
  if (!period) return null;
  const rows = await prisma.$queryRaw<{ metric: string; count: bigint; quantity: bigint }[]>`
    SELECT "metricKey" AS metric, count(*)::bigint AS count, coalesce(sum(amount), 0)::bigint AS quantity
    FROM "UsageEvent"
    WHERE "orgId" = ${orgId} AND "billingTreatment" = 'LEGACY'::"BillingTreatment"
      AND timestamp >= ${period.start} AND timestamp < ${period.end}
    GROUP BY "metricKey" ORDER BY "metricKey"
  `;
  return {
    orgId, month, periodStart: period.start.toISOString(), periodEnd: period.end.toISOString(),
    exclusionBasis: "LEGACY" as const,
    count: rows.reduce((sum, row) => sum + row.count, 0n).toString(),
    quantity: rows.reduce((sum, row) => sum + row.quantity, 0n).toString(),
    byMetric: rows.map((row) => ({ metric: row.metric, count: row.count.toString(), quantity: row.quantity.toString() })),
  };
}
