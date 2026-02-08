import { getInvoices } from "@/actions/billing/getInvoices";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { InvoicesTable } from "./invoices-table";
import { FileText } from "lucide-react";

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await params;
  const invoices = await getInvoices(user.id, orgId);

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
        <InvoicesTable invoices={invoices} />
      )}
    </>
  );
}
