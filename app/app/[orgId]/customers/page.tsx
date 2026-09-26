import { createCustomer } from "@/actions/customers/createCustomer";
import PageHeader from "@/components/layout/PageHeader";
import { getCurrentUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/authz/getMembership";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { orgId } = await params;
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");
  const membership = await getMembership(user.id, orgId);
  if (!membership) redirect("/app");

  const customers = await prisma.customer.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });
  const { error, created } = await searchParams;

  return (
    <>
      <PageHeader title="Customers" description="Billed customer identities for this organization." />
      {membership.role === Role.OWNER && (
        <form action={createCustomer.bind(null, orgId)} className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <label htmlFor="externalId" className="block text-sm font-medium">External customer ID</label>
          <p className="mb-3 text-sm text-slate-500">Use the stable ID from your own system.</p>
          <div className="flex flex-wrap gap-3">
            <input id="externalId" name="externalId" required className="rounded-md border border-slate-300 px-3 py-2" />
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-white">Create customer</button>
          </div>
          {error === "invalid" && <p role="alert" className="mt-2 text-sm text-red-700">Enter a nonblank ID without surrounding whitespace.</p>}
          {error === "duplicate" && <p role="alert" className="mt-2 text-sm text-red-700">This customer ID already exists in this organization.</p>}
          {created === "1" && <p role="status" className="mt-2 text-sm text-green-700">Customer created.</p>}
        </form>
      )}
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {customers.map((customer) => (
          <li key={customer.id} className="flex justify-between px-5 py-3 text-sm">
            <span>{customer.externalId}</span>
            <span className="text-slate-500">{customer.active ? "Active" : "Inactive"}</span>
          </li>
        ))}
        {customers.length === 0 && <li className="px-5 py-3 text-sm text-slate-500">No customers yet.</li>}
      </ul>
    </>
  );
}
