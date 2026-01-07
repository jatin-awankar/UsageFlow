import { AppError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { createOrganizationSchema } from "@/lib/validators";

export async function createOrganization(input: unknown, userId: string) {
  const parsed = createOrganizationSchema.safeParse({ name: input });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    const errorMessage = firstError?.message ?? "Invalid input";
    throw new AppError(errorMessage, 400);
  }

  const { name } = parsed.data;

  try {
    const org = await prisma.organization.create({
      data: {
        name,
        memberships: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });

    return org;
  } catch (err) {
    throw new AppError(`Failed to create organization: ${err}`, 500);
  }
}
