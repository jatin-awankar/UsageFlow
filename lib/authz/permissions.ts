import { Role } from "@/generated/prisma/enums";

export const permissions = {
  createMetric: [Role.OWNER, Role.ADMIN],
  createPlan: [Role.OWNER, Role.ADMIN],
  createApiKey: [Role.OWNER, Role.ADMIN, Role.DEVELOPER],
  createSubscription: [Role.OWNER, Role.ADMIN],
  createWebhook: [Role.OWNER, Role.ADMIN],
  viewUsage: [Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.VIEWER],
};
