"use server";

import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";
import { isSupportedCurrency } from "@/lib/money-contract";

export async function setCurrency(orgId: string, formData: FormData) {
  await requireCurrentOrgRole(orgId, [Role.OWNER]);
  const currency = formData.get("currency");
  if (typeof currency !== "string" || !isSupportedCurrency(currency)) {
    redirect(`/app/${orgId}/settings?currencyError=invalid`);
  }
  await prisma.organization.update({ where: { id: orgId }, data: { currency } });
  revalidatePath(`/app/${orgId}/settings`);
  redirect(`/app/${orgId}/settings?currencySaved=1`);
}
