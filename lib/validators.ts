// lib/validators.ts
import { z } from "zod";

export const createUserSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

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

export const usageEventSchema = z.object({
  metric: z.string().min(1),
  amount: z.number().int().positive(),
  customerId: z.string().optional(),
  timestamp: z.iso.datetime().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});
