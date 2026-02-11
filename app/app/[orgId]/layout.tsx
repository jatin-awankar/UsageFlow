import { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getMembership } from "@/lib/authz/getMembership";

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
  const membership = await getMembership(user.id, orgId);

  if (!membership) redirect("/onboarding");

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="shrink-0">
        <Sidebar orgId={orgId} role={membership.role} />
      </div>

      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <Topbar orgId={orgId} />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
