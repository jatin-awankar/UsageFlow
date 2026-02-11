import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { FileText } from "lucide-react";

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await Promise.resolve(params);

  const invoices = await prisma.invoice.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Invoices"
        description="View invoices generated for your billing cycles."
      />

      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Invoices will be generated automatically at the end of each billing period."
          icon={<FileText />}
        />
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2">Period</th>
                <th className="text-right px-4 py-2">Amount</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">
                    {invoice.periodStart.toDateString()} –{" "}
                    {invoice.periodEnd.toDateString()}
                  </td>

                  <td className="px-4 py-3 text-right font-medium">
                    ₹{invoice.amount}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={invoice.status} />
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/app/${orgId}/billing/invoices/${invoice.id}`}
                      className="text-sm text-black hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "PAID"
      ? "bg-green-100 text-green-700"
      : status === "FAILED"
      ? "bg-red-100 text-red-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <span
      className={`inline-block px-2 py-1 rounded text-xs font-medium ${styles}`}
    >
      {status}
    </span>
  );
}
