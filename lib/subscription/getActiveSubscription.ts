import prisma from "@/lib/prisma";

export async function getActiveSubscription(orgId: string) {
  return prisma.subscription.findFirst({
    where: {
      orgId,
      status: "ACTIVE",
    },
    include: {
      plan: {
        include: {
          planMetrics: {
            include: { metric: true },
          },
        },
      },
    },
  });
}
