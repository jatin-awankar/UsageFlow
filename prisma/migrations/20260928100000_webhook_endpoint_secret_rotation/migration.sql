ALTER TABLE "WebhookEndpoint" ADD COLUMN "previousSecret" TEXT, ADD COLUMN "previousSecretExpiresAt" TIMESTAMP(3);
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_previous_secret_pair" CHECK (("previousSecret" IS NULL) = ("previousSecretExpiresAt" IS NULL));
