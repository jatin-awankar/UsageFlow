// app/(dashboard)/usage/page.tsx
import { getUsageSummary } from "@/actions/analytics/getUsageSummary";
import { getCurrentUser } from "@/lib/auth";
import { UsageTable } from "./usage-table";

export default async function UsagePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const orgId = user.currentOrgId;

  const [usage] = await Promise.all([
    getUsageSummary(user.id, orgId),
  ]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Usage</h1>
      <UsageTable usage={usage} />
    </div>
  );
}
