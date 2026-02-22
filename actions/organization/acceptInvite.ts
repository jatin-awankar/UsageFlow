"use server";

import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

type AcceptInviteResult =
  | { success: false; error: string }
  | {
      success: true;
      orgId: string;
      orgName: string;
      alreadyMember: boolean;
    };

export async function acceptInvite(token: string): Promise<AcceptInviteResult> {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    return { success: false, error: "Invalid invitation link" };
  }

  const user = await getCurrentUser();
  if (!user?.id || !user.email) {
    return { success: false, error: "Please sign in to accept this invitation" };
  }

  const normalizedUserEmail = user.email.toLowerCase().trim();

  const invite = await prisma.organizationInvite.findUnique({
    where: { token: normalizedToken },
    include: {
      org: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!invite) {
    return { success: false, error: "This invitation link is invalid" };
  }

  if (invite.expiresAt <= new Date()) {
    return { success: false, error: "This invitation has expired" };
  }

  const normalizedInviteEmail = invite.email.toLowerCase().trim();
  if (normalizedInviteEmail !== normalizedUserEmail) {
    return {
      success: false,
      error: `This invite is for ${invite.email}. Please sign in with that account.`,
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingMembership = await tx.membership.findUnique({
        where: {
          userId_orgId: {
            userId: user.id,
            orgId: invite.orgId,
          },
        },
      });

      if (!existingMembership) {
        await tx.membership.create({
          data: {
            userId: user.id,
            orgId: invite.orgId,
            role: invite.role,
          },
        });
      }

      if (!invite.accepted) {
        await tx.organizationInvite.update({
          where: { id: invite.id },
          data: { accepted: true },
        });
      }

      return {
        orgId: invite.org.id,
        orgName: invite.org.name,
        alreadyMember: Boolean(existingMembership),
      };
    });

    return {
      success: true,
      ...result,
    };
  } catch {
    return {
      success: false,
      error: "Failed to accept invitation. Please try again.",
    };
  }
}
