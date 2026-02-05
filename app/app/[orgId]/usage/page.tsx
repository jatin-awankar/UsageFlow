// app/(dashboard)/usage/page.tsx
import { getUsageSummary } from "@/actions/analytics/getUsageSummary";
import { UsageTable } from "./usage-table";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function UsagePage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolvedParams = await Promise.resolve(params);
  const orgId = resolvedParams.orgId;

  const [usage] = await Promise.all([getUsageSummary(user.id, orgId)]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Usage</h1>
      {usage.length === 0 ? (
        <p className="text-gray-500">No Usage to show</p>
      ) : (
        <UsageTable usage={usage} />
      )}
    </div>
  );
}
