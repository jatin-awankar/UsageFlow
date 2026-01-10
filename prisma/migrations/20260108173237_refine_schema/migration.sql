/*
  Warnings:

  - The `status` column on the `WebhookDelivery` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `WebhookEvent` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[hashedKey]` on the table `ApiKey` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "lineItems" JSONB;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "externalCustomerId" TEXT;

-- AlterTable
ALTER TABLE "WebhookDelivery" DROP COLUMN "status",
ADD COLUMN     "status" "WebhookEventStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "WebhookEvent" DROP COLUMN "status",
ADD COLUMN     "status" "WebhookEventStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_hashedKey_key" ON "ApiKey"("hashedKey");
