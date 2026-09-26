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
  const published = await prisma.priceVersion.findFirst({ where: { orgId }, select: { id: true } });
  if (published) redirect(`/app/${orgId}/settings?currencyError=locked`);
  try {
    await prisma.organization.update({ where: { id: orgId }, data: { currency } });
  } catch (error) {
    // The database trigger closes the race with concurrent publication.
    if (error instanceof Error && error.message.includes("locks Organization currency")) {
      redirect(`/app/${orgId}/settings?currencyError=locked`);
    }
    throw error;
  }
  revalidatePath(`/app/${orgId}/settings`);
  redirect(`/app/${orgId}/settings?currencySaved=1`);
}
