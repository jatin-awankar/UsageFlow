import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/authz/requireRole";
import { getPriceAt, getPriceSchedule, publishFirstPrice, publishScheduledPrice } from "@/actions/pricing/firstPrice";
import { displayUnitPrice } from "@/lib/price-format";

const errors: Record<string, string> = {
  invalidPrice: "Enter a nonnegative unit price with at most six integer and six fractional digits.",
  invalidTime: "Enter a UTC instant strictly later than server time plus five minutes.",
  currency: "Price currency must match the Organization's explicit currency.",
  metric: "Metric does not belong to this Organization.",
  exists: "This metric already has a published first price.",
  conflict: "The start must be later than every published version for this metric.",
  missingFirst: "Publish the first price before scheduling another version.",
  ratedConflict: "This schedule would change the price of an already rated event.",
};

export default async function PricingPage({ params, searchParams }: {
  params: Promise<{ orgId: string; metricId: string }>;
  searchParams: Promise<{ priceError?: string; published?: string; at?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { orgId, metricId } = await params;
  const membership = await requireRole(user.id, orgId, [Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.VIEWER]);
  const metric = await prisma.metric.findFirst({ where: { id: metricId, orgId }, select: { name: true, key: true } });
  if (!metric) redirect(`/app/${orgId}/metrics`);
  const [org, versions, query] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId }, select: { currency: true } }),
    getPriceSchedule(orgId, metricId),
    searchParams,
  ]);
  const inspectionTime = query.at && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(query.at) && Number.isFinite(Date.parse(query.at)) && new Date(query.at).toISOString() === query.at ? new Date(query.at) : null;
  const applicable = inspectionTime ? await getPriceAt(orgId, metricId, inspectionTime) : null;
  return <main className="space-y-5 rounded-xl border bg-white p-6">
    <h1 className="text-xl font-semibold">Price for {metric.name} ({metric.key})</h1>
    {versions.length ? <section aria-label="Published price schedule" className="space-y-4">
      {versions.map((version, index) => <article key={version.id} className="border-b pb-3">
        <p>Unit price: {displayUnitPrice(version.unitPriceMicros)} {version.currency}</p>
        <p>Effective from (UTC): {version.effectiveFrom.toISOString()}</p>
        <p>Applies until (UTC, exclusive): {versions[index + 1]?.effectiveFrom.toISOString() ?? "No scheduled end"}</p>
        <p>Published by: {version.createdBy.email}</p>
        <p>Published at (UTC): {version.createdAt.toISOString()}</p>
      </article>)}
    </section> : <p>No published price. Events before the first effective instant have no applicable price.</p>}
    <form method="GET" className="space-y-2">
      <label className="block">Inspect UTC instant <input className="block rounded border p-2" name="at" placeholder="2026-09-27T12:00:00.000Z" defaultValue={query.at ?? ""} /></label>
      <button className="rounded border px-4 py-2" type="submit">Inspect price</button>
    </form>
    {query.at && <p role="status">{inspectionTime ? applicable ? `Applicable unit price: ${displayUnitPrice(applicable.unitPriceMicros)} ${applicable.currency}` : "No applicable price at this instant." : "Enter a valid UTC instant."}</p>}
    {membership.role === Role.OWNER && <form action={(versions.length ? publishScheduledPrice : publishFirstPrice).bind(null, orgId, metricId)} className="space-y-3">
      <label className="block">Unit price <input className="block rounded border p-2" name="unitPrice" required placeholder="0.000000" /></label>
      <label className="block">Currency <input className="block rounded border p-2" name="currency" required defaultValue={org?.currency ?? ""} /></label>
      <label className="block">Effective from (UTC, ISO 8601) <input className="block rounded border p-2" name="effectiveFrom" required placeholder="2026-09-27T12:00:00.000Z" /></label>
      <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">{versions.length ? "Publish scheduled price" : "Publish first price"}</button>
    </form>}
    {query.priceError && <p role="alert">{errors[query.priceError] ?? "Could not publish price."}</p>}
    {query.published && <p role="status">Price version published.</p>}
  </main>;
}
