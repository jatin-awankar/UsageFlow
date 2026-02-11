"use server";

import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";

export async function getInvoices(userId: string, orgId: string) {
  await requireRole(userId, orgId, [Role.OWNER, Role.ADMIN]);

  const invoices = await prisma.invoice.findMany({
    where: {
      orgId,
    },
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      amount: true,
      status: true,
    },
  });

  return invoices.map((row) => ({
    id: row.id,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    amount: row.amount,
    status: row.status,
  }));
}
