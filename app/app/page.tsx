import { redirect } from "next/navigation";

import AppHomeEmptyState from "@/components/appHome/AppHomeEmptyState";
import AppHomeHero from "@/components/appHome/AppHomeHero";
import OrganizationGrid from "@/components/appHome/OrganizationGrid";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserOrganizations } from "@/lib/org/getUserOrganizations";

export default async function AppHome() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const organizations = await getUserOrganizations(user.id);

  return (
    <main className="min-h-screen bg-linear-to-b from-slate-100 via-slate-50 to-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <AppHomeHero
          email={user.email || "user@workspace"}
          organizationCount={organizations.length}
        />

        {organizations.length === 0 ? (
          <AppHomeEmptyState />
        ) : (
          <OrganizationGrid organizations={organizations} />
        )}
      </div>
    </main>
  );
}
