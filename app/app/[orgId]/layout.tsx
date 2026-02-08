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

  const { orgId } = await Promise.resolve(params);

  return (
    <div className="flex h-screen bg-gray-50">
      <div>
        <Sidebar orgId={orgId} />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar orgId={orgId} />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
