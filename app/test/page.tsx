export const runtime = "nodejs";


import { createApiKey } from "@/actions/apiKeys/createApiKey";
import { createMetric } from "@/actions/metrics/createMetric";
import { createOrganization } from "@/actions/organization/createOrganization";
import { usageQueue } from "@/lib/queue";

export default async function TestPage() {
  await usageQueue.add("TEST_JOB", { hello: "usageflow" });

  const userId = "test-user-id-123";

  const org = await createOrganization({ name: "Test Org" }, userId);

  const [apiKey, metric] = await Promise.all([
    createApiKey("Test New", userId, org.id),
    createMetric(
      { name: "API CALLs", key: "API_CALLs", unit: "request" },
      userId,
      org.id
    ),
  ]);

  return (
    <pre>
      {JSON.stringify(org, null, 2)}
      {"\n\n"}
      {JSON.stringify(metric, null, 2)}
      {"\n\n"}
      {JSON.stringify(apiKey, null, 2)}
    </pre>
  );
}
