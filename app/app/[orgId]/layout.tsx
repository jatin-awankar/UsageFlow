import { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function OrgLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Ensure params is always an object, even if it's a Promise.
  const resolvedParams = await Promise.resolve(params);
  const orgId = resolvedParams.orgId;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar orgId={orgId} />

      {/* Main Area */}
      <div className="flex flex-col flex-1">
        <Topbar orgId={orgId} />

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
