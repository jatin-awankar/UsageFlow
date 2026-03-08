import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import PageHeader from "@/components/layout/PageHeader";
import InvoicesEmptyState from "@/components/invoices/InvoicesEmptyState";
import InvoicesOverview from "@/components/invoices/InvoicesOverview";
import InvoicesList from "@/components/invoices/InvoicesList";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
        description="Review invoice history, statuses, and finalized totals for each billing cycle."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/app/${orgId}/billing`}>
              <ArrowLeft className="size-4" />
              Back to billing
            </Link>
          </Button>
        }
      />

      {invoices.length === 0 ? (
        <InvoicesEmptyState orgId={orgId} />
      ) : (
        <section className="space-y-6">
          <InvoicesOverview invoices={invoices} />
          <InvoicesList orgId={orgId} invoices={invoices} />
        </section>
      )}
    </>
  );
}
