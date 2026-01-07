export const runtime = "nodejs";

import { createOrganization } from "../actions/createOrganization";

export default async function TestPage() {
  const org = await createOrganization(
    "Test Org from Page",
    "test-user-id-123"
  );

  return (
    <pre>{JSON.stringify(org, null, 2)}</pre>
  );
}
