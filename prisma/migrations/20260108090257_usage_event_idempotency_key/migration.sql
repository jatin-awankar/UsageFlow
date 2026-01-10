/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `UsageEvent` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "UsageEvent" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "UsageEvent_idempotencyKey_key" ON "UsageEvent"("idempotencyKey");
