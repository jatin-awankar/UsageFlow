import { createHmac } from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export const pageSize = 100;

const SAFE_LEDGER_FAILURE_REASONS = [
  "LEDGER_EVENT_INVALID",
  "LEDGER_STORAGE_FAILED",
  "LEDGER_PROJECTION_FAILED",
] as const;
type SafeLedgerFailureReason = (typeof SAFE_LEDGER_FAILURE_REASONS)[number];

function exportFailureReason(reason: string | null | undefined): SafeLedgerFailureReason | null {
  return SAFE_LEDGER_FAILURE_REASONS.find((safeReason) => safeReason === reason) ?? null;
}

export function utcPeriod(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  if (year === 0) return null;
  const start = new Date(0);
  start.setUTCFullYear(year, month - 1, 1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCMonth(month);
  return { start, end };
}

export async function createLedgerExport(orgId: string, period: { start: Date; end: Date }) {
  const referenceSecret = process.env.NEXTAUTH_SECRET;
  if (!referenceSecret) throw new Error("Export key reference secret is not configured");
  return prisma.$transaction(async (tx) => {
    const events = await tx.usageEvent.findMany({
      where: { orgId, billingTreatment: "LEDGER_ONLY", timestamp: { gte: period.start, lt: period.end } },
      orderBy: [{ timestamp: "asc" }, { id: "asc" }],
      select: {
        id: true, idempotencyKey: true, timestamp: true, receivedAt: true,
        metricKey: true, amount: true, processingState: true,
        billedCustomer: { select: { externalId: true } },
        processingIntent: { select: { failureReason: true } },
      },
    });
    if (events.some((event) => !event.billedCustomer || !event.receivedAt || !event.processingState)) {
      throw new Error("Ledger event is incomplete");
    }
    const totals = new Map<string, { externalCustomerId: string; metric: string; count: number; quantity: number }>();
    const rows = events.map((event, position) => {
      const externalCustomerId = event.billedCustomer!.externalId;
      const key = JSON.stringify([externalCustomerId, event.metricKey]);
      const total = totals.get(key) ?? { externalCustomerId, metric: event.metricKey, count: 0, quantity: 0 };
      total.count += 1;
      total.quantity += event.amount;
      totals.set(key, total);
      return {
        position, eventId: event.id,
        keyReference: createHmac("sha256", referenceSecret).update(event.idempotencyKey ?? "").digest("hex").slice(0, 16),
        occurredAt: event.timestamp, receivedAt: event.receivedAt!,
        externalCustomerId, metric: event.metricKey, quantity: event.amount,
        processingState: event.processingState!,
        failureReason: exportFailureReason(event.processingIntent?.failureReason),
      };
    });
    const snapshot = await tx.ledgerExport.create({
      data: { orgId, periodStart: period.start, periodEnd: period.end, totals: [...totals.values()] },
    });
    for (let index = 0; index < rows.length; index += 1000) {
      await tx.ledgerExportRow.createMany({ data: rows.slice(index, index + 1000).map((row) => ({ ...row, exportId: snapshot.id })) });
    }
    return { id: snapshot.id, periodStart: snapshot.periodStart, periodEnd: snapshot.periodEnd, createdAt: snapshot.createdAt, totals: snapshot.totals, rowCount: rows.length };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 120_000 });
}
