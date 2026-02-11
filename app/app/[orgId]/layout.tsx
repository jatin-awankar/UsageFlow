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
    <div className="flex h-screen bg-gray-50">
      <div className="shrink-0">
        <Sidebar orgId={orgId} role={currentMembership.role} />
      </div>

      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <Topbar
          orgId={orgId}
          role={currentMembership.role}
          organizations={memberships.map((m) => m.org)}
        />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
