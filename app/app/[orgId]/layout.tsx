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
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute right-[-120px] top-32 h-96 w-96 rounded-full bg-indigo-300/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-160px] left-1/3 h-96 w-[640px] rounded-full bg-sky-200/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(100,116,139,0.12)_1px,transparent_0)] bg-size-[24px_24px] opacity-40" />

      <div className="relative mx-auto flex h-screen w-full max-w-[1600px] gap-4 px-3 py-3 sm:px-4 lg:gap-6 lg:px-6 lg:py-5">
        <div className="hidden shrink-0 lg:block">
          <div className="h-full w-72 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-900/5 backdrop-blur">
            <Sidebar orgId={orgId} role={currentMembership.role} />
          </div>
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/65 shadow-xl shadow-slate-900/5 backdrop-blur">
          <Topbar
            orgId={orgId}
            role={currentMembership.role}
            userEmail={user.email || ""}
            organizations={memberships.map((m) => m.org)}
          />

          <div className="border-b border-slate-200/80 bg-white/75 px-3 py-2 backdrop-blur lg:hidden">
            <details>
              <summary className="cursor-pointer rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 marker:hidden">
                Navigation
              </summary>
              <div className="mt-2 max-h-[65vh] overflow-y-auto rounded-xl border border-slate-200 bg-white">
                <Sidebar orgId={orgId} role={currentMembership.role} />
              </div>
            </details>
          </div>

          <main className="flex-1 overflow-y-auto px-3 pb-5 pt-3 sm:px-5 sm:pb-6 lg:px-7 lg:pb-7">
            <div className="mx-auto w-full max-w-7xl animate-in fade-in slide-in-from-bottom-1 duration-500">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
