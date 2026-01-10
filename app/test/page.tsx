export const runtime = "nodejs";

import { createApiKey } from "../actions/createApiKey";
import { createMetric } from "../actions/createMetric";
import { createOrganization } from "../actions/createOrganization";

import { usageQueue } from "@/lib/queue";

export default async function TestPage() {


await usageQueue.add("TEST_JOB", { hello: "usageflow" });


  const userId = "test-user-id-123";

  
  const org = await createOrganization(
    {name: "Test Org"},
    userId
  );
  
  const apiKey = await createApiKey(
    "Test",
    userId,
    org.id,
  )

  const metric = await createMetric(
    {name: "API CALLs",
      key: "API_CALLs",
      unit: "request",
    },
    userId,
    org.id,
  )

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
