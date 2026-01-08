export const runtime = "nodejs";

import { createMetric } from "../actions/createMetric";
import { createOrganization } from "../actions/createOrganization";

export default async function TestPage() {

  const userId = "test-user-id-123";

  const org = await createOrganization(
    {name: "Test Org"},
    userId
  );

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
    </pre>
  );
}
