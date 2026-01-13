// app/app/page.tsx
import { getCurrentUser } from "@/lib/auth/session";
import { getUserOrganizations } from "@/lib/org/getUserOrganizations";
import { redirect } from "next/navigation";

export default async function AppHome() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const orgs = await getUserOrganizations(user.id);

  if (orgs.length === 0) {
    redirect("/onboarding/create-org");
  }

  const firstOrg = orgs[0];
  redirect(`/app/${firstOrg.id}/dashboard`);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Welcome to UsageFlow</h1>
      <p>You are authenticated.</p>
    </div>
  );
}
