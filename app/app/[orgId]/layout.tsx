import { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function OrgLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await Promise.resolve(params);
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: {
      org: true,
    },
  });

  const currentMembership = memberships.find((m) => m.orgId === orgId);

  if (!currentMembership) redirect("/app");

  return (
    <div className="relative flex h-screen overflow-hidden bg-linear-to-b from-slate-100 via-slate-50 to-white">
      <div className="pointer-events-none absolute -bottom-48 right-0 h-104 w-104 rounded-full bg-cyan-200/20 blur-3xl" />

      <div className="relative shrink-0">
        <Sidebar orgId={orgId} role={currentMembership.role} />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          orgId={orgId}
          role={currentMembership.role}
          userEmail={user.email || ""}
          organizations={memberships.map((m) => m.org)}
        />

        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <div className="mx-auto w-full max-w-6xl animate-in fade-in slide-in-from-bottom-1 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
