"use server";

import { Role, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentOrgRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";

const PRICE_PATTERN = /^(0|[1-9]\d{0,5})(\.\d{1,6})?$/;
const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export async function getFirstPrice(orgId: string, metricId: string) {
  await requireCurrentOrgRole(orgId, [Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.VIEWER]);
  return prisma.priceVersion.findFirst({
    where: { orgId, metricId },
    include: { createdBy: { select: { email: true } } },
    orderBy: { effectiveFrom: "asc" },
  });
}

export async function getPriceSchedule(orgId: string, metricId: string) {
  await requireCurrentOrgRole(orgId, [Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.VIEWER]);
  return prisma.priceVersion.findMany({
    where: { orgId, metricId },
    include: { createdBy: { select: { email: true } } },
    orderBy: { effectiveFrom: "asc" },
  });
}

export async function getPriceAt(orgId: string, metricId: string, at: Date) {
  await requireCurrentOrgRole(orgId, [Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.VIEWER]);
  return prisma.priceVersion.findFirst({
    where: { orgId, metricId, effectiveFrom: { lte: at } },
    orderBy: { effectiveFrom: "desc" },
  });
}

type PublicationKind = "first" | "scheduled";

async function publishPrice(orgId: string, metricId: string, formData: FormData, kind: PublicationKind) {
  const { user } = await requireCurrentOrgRole(orgId, [Role.OWNER]);
  const path = `/app/${orgId}/metrics/${metricId}/pricing`;
  const fail = (code: string) => redirect(`${path}?priceError=${code}`);
  const price = formData.get("unitPrice");
  const currency = formData.get("currency");
  const effective = formData.get("effectiveFrom");
  if (typeof price !== "string" || !PRICE_PATTERN.test(price)) return fail("invalidPrice");
  const [whole, fraction = ""] = price.split(".");
  const micros = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0") || "0");
  if (micros > 999_999_999_999n) return fail("invalidPrice");
  if (typeof effective !== "string" || !UTC_INSTANT.test(effective) || !Number.isFinite(Date.parse(effective)) || new Date(effective).toISOString() !== effective) return fail("invalidTime");
  const effectiveFrom = new Date(effective);
  if (effectiveFrom.getTime() <= Date.now() + 300_000) fail("invalidTime");
  if (typeof currency !== "string") fail("currency");

  try {
    await prisma.$transaction(async (tx) => {
      // Serialize publication and currency decisions for this Organization.
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${orgId} FOR NO KEY UPDATE`;
      const [org, metric, latest] = await Promise.all([
        tx.organization.findUnique({ where: { id: orgId }, select: { currency: true } }),
        tx.metric.findFirst({ where: { id: metricId, orgId }, select: { id: true } }),
        tx.priceVersion.findFirst({ where: { orgId, metricId }, orderBy: { effectiveFrom: "desc" }, select: { effectiveFrom: true } }),
      ]);
      if (!metric) throw new Error("metric");
      if (!org?.currency || org.currency !== currency) throw new Error("currency");
      if (kind === "first" && latest) throw new Error("exists");
      if (kind === "scheduled" && !latest) throw new Error("missingFirst");
      if (kind === "scheduled" && latest && effectiveFrom <= latest.effectiveFrom) throw new Error("conflict");
      if (effectiveFrom.getTime() <= Date.now() + 300_000) throw new Error("invalidTime");
      const changedRating = await tx.ratedEvent.findFirst({
        where: { orgId, priceVersion: { metricId }, event: { timestamp: { gte: effectiveFrom } } },
        select: { eventId: true },
      });
      if (changedRating) throw new Error("ratedConflict");
      await tx.priceVersion.create({ data: { orgId, metricId, currency, unitPriceMicros: micros, effectiveFrom, createdById: user.id } });
    });
  } catch (error) {
    if (error instanceof Error && ["metric", "currency", "exists", "missingFirst", "conflict", "invalidTime", "ratedConflict"].includes(error.message)) fail(error.message);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") fail(kind === "first" ? "exists" : "conflict");
    throw error;
  }
  revalidatePath(path);
  redirect(`${path}?published=1`);
}

export async function publishFirstPrice(orgId: string, metricId: string, formData: FormData) {
  return publishPrice(orgId, metricId, formData, "first");
}

export async function publishScheduledPrice(orgId: string, metricId: string, formData: FormData) {
  return publishPrice(orgId, metricId, formData, "scheduled");
}
