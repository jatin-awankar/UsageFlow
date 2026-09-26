import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/authz/requireRole";
import { getFirstPrice, publishFirstPrice } from "@/actions/pricing/firstPrice";
import { displayUnitPrice } from "@/lib/price-format";

const errors: Record<string, string> = {
  invalidPrice: "Enter a nonnegative unit price with at most six integer and six fractional digits.",
  invalidTime: "Enter a UTC instant strictly later than server time plus five minutes.",
  currency: "Price currency must match the Organization's explicit currency.",
  metric: "Metric does not belong to this Organization.",
  exists: "This metric already has a published first price.",
};

export default async function PricingPage({ params, searchParams }: {
  params: Promise<{ orgId: string; metricId: string }>;
  searchParams: Promise<{ priceError?: string; published?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { orgId, metricId } = await params;
  const membership = await requireRole(user.id, orgId, [Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.VIEWER]);
  const metric = await prisma.metric.findFirst({ where: { id: metricId, orgId }, select: { name: true, key: true } });
  if (!metric) redirect(`/app/${orgId}/metrics`);
  const [org, version, query] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId }, select: { currency: true } }),
    getFirstPrice(orgId, metricId),
    searchParams,
  ]);
  return <main className="space-y-5 rounded-xl border bg-white p-6">
    <h1 className="text-xl font-semibold">Price for {metric.name} ({metric.key})</h1>
    {version ? <section aria-label="Published first price" className="space-y-1">
      <p>Unit price: {displayUnitPrice(version.unitPriceMicros)} {version.currency}</p>
      <p>Effective from (UTC): {version.effectiveFrom.toISOString()}</p>
      <p>Published by: {version.createdBy.email}</p>
      <p>Published at (UTC): {version.createdAt.toISOString()}</p>
    </section> : <p>No published price. Events before the first effective instant have no applicable price.</p>}
    {membership.role === Role.OWNER && !version && <form action={publishFirstPrice.bind(null, orgId, metricId)} className="space-y-3">
      <label className="block">Unit price <input className="block rounded border p-2" name="unitPrice" required placeholder="0.000000" /></label>
      <label className="block">Currency <input className="block rounded border p-2" name="currency" required defaultValue={org?.currency ?? ""} /></label>
      <label className="block">Effective from (UTC, ISO 8601) <input className="block rounded border p-2" name="effectiveFrom" required placeholder="2026-09-27T12:00:00.000Z" /></label>
      <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Publish first price</button>
    </form>}
    {query.priceError && <p role="alert">{errors[query.priceError] ?? "Could not publish price."}</p>}
    {query.published && <p role="status">First price published.</p>}
  </main>;
}
