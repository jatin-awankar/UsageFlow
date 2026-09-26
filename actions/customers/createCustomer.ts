"use server";

import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";
import { Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCustomer(orgId: string, formData: FormData) {
  await requireCurrentOrgRole(orgId, [Role.OWNER]);

  const externalId = formData.get("externalId");
  if (typeof externalId !== "string" || !externalId || externalId !== externalId.trim()) {
    redirect(`/app/${orgId}/customers?error=invalid`);
  }

  try {
    await prisma.customer.create({ data: { orgId, externalId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`/app/${orgId}/customers?error=duplicate`);
    }
    throw error;
  }

  revalidatePath(`/app/${orgId}/customers`);
  redirect(`/app/${orgId}/customers?created=1`);
}
