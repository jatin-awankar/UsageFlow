import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/authz/getMembership";
import { previewPricingGap } from "@/lib/pricing-gap-preview";
import { ApproveGap } from "./ApproveGap";

export default async function GapPreviewPage({ params, searchParams }: {
  params: Promise<{ orgId: string; metricId: string }>;
  searchParams: Promise<{ customerId?: string; start?: string; end?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { orgId, metricId } = await params;
  if ((await getMembership(user.id, orgId))?.role !== "OWNER") redirect(`/app/${orgId}/metrics`);
  const metric = await prisma.metric.findFirst({ where: { id: metricId, orgId }, select: { name: true } });
  if (!metric) redirect(`/app/${orgId}/metrics`);
  const query = await searchParams;
  const customers = await prisma.customer.findMany({ where: { orgId }, orderBy: { externalId: "asc" }, select: { id: true, externalId: true } });
  const result = query.customerId || query.start || query.end
    ? await previewPricingGap(orgId, metricId, query.customerId ?? "", query.start ?? "", query.end ?? "", user.id) : null;
  return <main className="space-y-5 rounded-xl border bg-white p-6">
    <Link href={`/app/${orgId}/metrics/${metricId}/pricing`} className="underline">Back to pricing</Link>
    <h1 className="text-xl font-semibold">Preview pricing gap for {metric.name}</h1>
    <p>Review eligible UNRATED events for one Customer. This preview does not change ratings or prices.</p>
    <form method="GET" className="space-y-3">
      <label className="block">Customer <select name="customerId" required defaultValue={query.customerId ?? ""} className="block rounded border p-2"><option value="">Select a Customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.externalId}</option>)}</select></label>
      <label className="block">Start (UTC, inclusive) <input name="start" required className="block rounded border p-2" placeholder="2026-09-01T00:00:00.000Z" defaultValue={query.start ?? ""} /></label>
      <label className="block">End (UTC, exclusive) <input name="end" required className="block rounded border p-2" placeholder="2026-10-01T00:00:00.000Z" defaultValue={query.end ?? ""} /></label>
      <button type="submit" className="rounded border px-4 py-2">Preview gap</button>
    </form>
    {result && ("error" in result ? <p role="alert">{result.error}</p> : <section aria-label="Pricing gap preview" className="space-y-3">
      <p>Interval: [{result.start}, {result.end})</p>
      <p>Customer: {result.externalCustomerId} ({result.customerId})</p>
      <p>Currency: {result.currency}</p>
      <p>Eligible UNRATED event IDs: {result.eligibleEventIds.length ? result.eligibleEventIds.join(", ") : "None"}</p>
      <table className="w-full text-left"><thead><tr><th>Event ID</th><th>Occurred (UTC)</th><th>Received (UTC)</th><th>Metric</th><th>Quantity</th><th>Ledger state</th></tr></thead><tbody>{result.events.map((event) => <tr key={event.eventId}><td>{event.eventId}</td><td>{event.occurredAt}</td><td>{event.receivedAt ?? "—"}</td><td>{event.metric}</td><td>{event.quantity}</td><td>{event.processingState}</td></tr>)}</tbody></table>
      <ApproveGap orgId={orgId} metricId={metricId} customerId={result.customerId} start={result.start} end={result.end} currency={result.currency} eligibleEventIds={result.eligibleEventIds} reviewedAt={result.reviewedAt} reviewToken={result.reviewToken} />
    </section>)}
  </main>;
}
