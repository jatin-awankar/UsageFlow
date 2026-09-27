import Link from "next/link";
import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { getCurrentUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/authz/getMembership";
import { getLegacyExclusionReport, utcMonth } from "@/lib/legacy-exclusion-report";

export default async function LegacyExclusionsPage({ params, searchParams }: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { orgId } = await params;
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");
  if ((await getMembership(user.id, orgId))?.role !== "OWNER") redirect(`/app/${orgId}/billing`);
  const requestedMonth = (await searchParams).month;
  const month = requestedMonth ?? new Date().toISOString().slice(0, 7);
  const report = utcMonth(month) ? await getLegacyExclusionReport(orgId, month) : null;

  return (
    <>
      <PageHeader title="Excluded legacy usage" description="Organization-level reconciliation of historical LEGACY events by UTC month." />
      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-600">These events are excluded from every Customer draft. This report uses stored billing treatment; it does not verify or assign a Customer identity.</p>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm font-medium" htmlFor="month">UTC month
            <input id="month" name="month" type="month" required defaultValue={utcMonth(month) ? month : ""} className="rounded-md border border-slate-300 px-3 py-2" />
          </label>
          <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">View report</button>
        </form>
        {!report ? <p role="alert">Enter a valid UTC month.</p> : (
          <section aria-label="Legacy exclusions" className="space-y-3">
            <p className="text-sm text-slate-600">Period: {report.periodStart} to {report.periodEnd} (end exclusive)</p>
            <p className="font-medium">Excluded LEGACY events: {report.count}; quantity: {report.quantity}</p>
            <table className="w-full text-left text-sm">
              <thead><tr><th scope="col">Metric</th><th scope="col">Events</th><th scope="col">Quantity</th></tr></thead>
              <tbody>{report.byMetric.map((row) => <tr key={row.metric} className="border-t border-slate-200"><th scope="row">{row.metric}</th><td>{row.count}</td><td>{row.quantity}</td></tr>)}</tbody>
            </table>
            {report.byMetric.length === 0 && <p>No excluded LEGACY events in this period.</p>}
          </section>
        )}
        <Link href={`/app/${orgId}/billing`} className="inline-block text-sm text-sky-700 underline">Back to billing</Link>
      </div>
    </>
  );
}
