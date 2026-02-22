"use server";

import crypto from "crypto";
import { z } from "zod";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/authz/requireRole";
import prisma from "@/lib/prisma";

const inviteEmailSchema = z.email();

export async function inviteUser(orgId: string, email: string, role: Role) {
  const inviter = await getCurrentUser();
  if (!inviter?.id || !inviter.email) {
    return { error: "You must be signed in to invite members" };
  }

  await requireRole(inviter.id, orgId, [Role.OWNER, Role.ADMIN]);

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedInviterEmail = inviter.email.toLowerCase().trim();

  const parsedEmail = inviteEmailSchema.safeParse(normalizedEmail);
  if (!parsedEmail.success) {
    return { error: "Please enter a valid email address" };
  }

  if (normalizedEmail === normalizedInviterEmail) {
    return { error: "You are already a member of this organization" };
  }

  if (role === Role.OWNER) {
    return { error: "Owner role cannot be assigned through invitations" };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_orgId: {
          userId: existingUser.id,
          orgId,
        },
      },
    });

    if (membership) {
      return { error: "User is already a member" };
    }
  }

  const existingInvite = await prisma.organizationInvite.findFirst({
    where: {
      orgId,
      email: normalizedEmail,
      accepted: false,
      expiresAt: { gt: new Date() },
    },
    select: {
      token: true,
      expiresAt: true,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const invitePath = (token: string) => `/invite?token=${token}`;
  const buildInviteUrl = (token: string) =>
    appUrl ? `${appUrl}${invitePath(token)}` : invitePath(token);

  if (existingInvite) {
    return {
      error: "An active invite already exists for this email",
      inviteUrl: buildInviteUrl(existingInvite.token),
      expiresAt: existingInvite.expiresAt,
    };
  }

  const token = crypto.randomBytes(32).toString("hex");

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  await prisma.organizationInvite.create({
    data: {
      orgId,
      email: normalizedEmail,
      role,
      token,
      expiresAt,
    },
  });

  return {
    success: true,
    inviteUrl: buildInviteUrl(token),
    expiresAt,
  };
}
