/*
  Warnings:

  - You are about to drop the column `endpointId` on the `WebhookEvent` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "WebhookEvent" DROP CONSTRAINT "WebhookEvent_endpointId_fkey";

-- AlterTable
ALTER TABLE "WebhookEvent" DROP COLUMN "endpointId";
