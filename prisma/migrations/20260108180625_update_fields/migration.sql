-- AlterTable
ALTER TABLE "WebhookDelivery" ADD COLUMN     "durationMs" INTEGER;

-- AlterTable
ALTER TABLE "WebhookEndpoint" ADD COLUMN     "events" TEXT[];
