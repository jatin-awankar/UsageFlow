import { getInvoices } from "@/actions/billing/getInvoices";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { InvoicesTable } from "./invoices-table";

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolvedParams = await Promise.resolve(params);
  const orgId = resolvedParams.orgId;

  const invoices = await getInvoices(user.id, orgId);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Invoices</h1>

      {invoices.length === 0 ? (
        <p>No Usage to show</p>
      ) : (
        <InvoicesTable invoices={invoices} />
      )}
    </div>
  );
}
