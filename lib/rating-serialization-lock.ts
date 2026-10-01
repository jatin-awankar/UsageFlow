import type { Prisma } from "@prisma/client";

// A hash collision can only make unrelated Organizations wait, never weaken ordering.
const keyFor = (orgId: string) => `usageflow:rating:${orgId}`;

export async function lockOrdinaryRating(tx: Prisma.TransactionClient, orgId: string, eventId: string) {
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock_shared(hashtextextended(${keyFor(orgId)}, 0))`;
  // Shared Organization locks allow parallel ratings; this row lock preserves
  // idempotence when two workers race to rate the same UsageEvent.
  await tx.$queryRaw`SELECT id FROM "UsageEvent" WHERE id = ${eventId} FOR UPDATE`;
}

export async function lockPriceMutation(tx: Prisma.TransactionClient, orgId: string) {
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${keyFor(orgId)}, 0))`;
  // Keep the row lock for currency edits and Organization deletion.
  return tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Organization" WHERE id = ${orgId} FOR NO KEY UPDATE`;
}
