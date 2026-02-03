/*
  Warnings:

  - The `status` column on the `WebhookDelivery` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[webhookEventId,endpointId,attempt]` on the table `WebhookDelivery` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `endpointId` to the `WebhookDelivery` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "WebhookDelivery" ADD COLUMN     "endpointId" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "WebhookDelivery_webhookEventId_endpointId_attempt_key" ON "WebhookDelivery"("webhookEventId", "endpointId", "attempt");

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
