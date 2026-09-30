import assert from "node:assert/strict";
import prisma from "../lib/prisma";
import { findRecoveryCandidates } from "../worker/recoverLedgerWork";

const now = new Date("2026-10-04T00:00:00.000Z");
const cutoff = new Date(now.getTime() - 1000);
const base = { metricKey: "CALLS", amount: 1, timestamp: now, orgId: "org-c", subscriptionId: "sub-c", apiKeyId: "key-c" };
await prisma.organization.create({ data: { id: "org-c", name: "Org" } });
await prisma.apiKey.create({ data: { id: "key-c", name: "Key", hashedKey: "hash", orgId: "org-c" } });
await prisma.plan.create({ data: { id: "plan-c", name: "Plan", basePrice: 0, billingPeriod: "MONTHLY", orgId: "org-c" } });
await prisma.subscription.create({ data: { id: "sub-c", status: "ACTIVE", periodStart: now, orgId: "org-c", planId: "plan-c" } });
const cases = [
  ["pending-old", "PENDING", "LEDGER_ONLY", -2000, null],
  ["pending-boundary", "PENDING", "LEDGER_ONLY", -1000, null],
  ["pending-new", "PENDING", "LEDGER_ONLY", -999, null],
  ["failed", "FAILED", "LEDGER_ONLY", -2000, null],
  ["processing-expired", "PROCESSING", "LEDGER_ONLY", -2000, -1],
  ["processing-lease-boundary", "PROCESSING", "LEDGER_ONLY", -2000, 0],
  ["failed-live-lease", "FAILED", "LEDGER_ONLY", -2000, 1],
  ["legacy", "FAILED", "LEGACY", -2000, null],
  ["processed", "PROCESSED", "LEDGER_ONLY", -2000, null],
] as const;
for (const [id, state, treatment, createdDelta, leaseDelta] of cases) {
  await prisma.usageEvent.create({ data: { ...base, id, processingState: state, billingTreatment: treatment } });
  await prisma.ledgerProcessingIntent.create({ data: { eventId: id, createdAt: new Date(now.getTime() + createdDelta), leaseUntil: leaseDelta === null ? null : new Date(now.getTime() + leaseDelta) } });
}
for (let i = 0; i < 205; i++) {
  const id = `bulk-${String(i).padStart(3, "0")}`;
  await prisma.usageEvent.create({ data: { ...base, id, processingState: "FAILED", billingTreatment: "LEDGER_ONLY" } });
  await prisma.ledgerProcessingIntent.create({ data: { eventId: id, createdAt: new Date(now.getTime() - 3000) } });
}
const eligible = { event: { billingTreatment: "LEDGER_ONLY" as const }, AND: [
  { OR: [{ event: { processingState: "PENDING" as const }, createdAt: { lte: cutoff } }, { event: { processingState: { in: ["PROCESSING" as const, "FAILED" as const] } } }] },
  { OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
] };
for (const after of [null, { createdAt: new Date(now.getTime() - 3000), eventId: "bulk-099" }, { createdAt: new Date(now.getTime() - 2000), eventId: "failed" }, { createdAt: now, eventId: "zzz" }]) {
  const where = after ? { AND: [eligible, { OR: [{ createdAt: { gt: after.createdAt } }, { createdAt: after.createdAt, eventId: { gt: after.eventId } }] }] } : eligible;
  const oldRows = await prisma.ledgerProcessingIntent.findMany({ where, select: { eventId: true, createdAt: true, event: { select: { processingState: true } } }, orderBy: [{ createdAt: "asc" }, { eventId: "asc" }], take: 200 });
  const newRows = await findRecoveryCandidates(now, cutoff, after);
  assert.deepEqual(newRows, oldRows, `candidate IDs and order after ${after?.eventId ?? "start"}`);
}
console.log("Recovery candidate PostgreSQL equivalence passed: states, leases, legacy, cutoff, cursor and 200-row limit");
await prisma.$disconnect();
