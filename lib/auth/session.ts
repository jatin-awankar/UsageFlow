// lib/auth/session.ts
import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  return session?.user ?? null;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}
