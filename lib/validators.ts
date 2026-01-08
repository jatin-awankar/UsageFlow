import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(3, "Organization name must be at least 3 characters")
    .max(100, "Organization name too long"),
});

export const createMetricSchema = z.object({
  name: z.string().min(2),
  key: z.string().min(2),
  unit: z.string().min(1),
});

export const createPlanSchema = z.object({
  name: z.string().min(2),
  basePrice: z.number().min(0),
  billingPeriod: z.enum(["MONTHLY", "YEARLY"]),
});

export const createSubscriptionSchema = z.object({
  planId: z.string().uuid(),
  periodStart: z.date(),
  periodEnd: z.date(),
});

export const createWebhookSchema = z.object({
  url: z.string().url(),
});
