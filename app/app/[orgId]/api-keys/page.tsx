import { getCurrentUser } from "@/lib/auth/session";
import { getApiKeys } from "@/actions/apiKeys/getApiKeys";
import { redirect } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import CreateApiKeyForm from "@/components/forms/CreateApiKeyForm";
import ApiKeysEmptyState from "@/components/apiKeys/ApiKeysEmptyState";
import ApiKeysOverview from "@/components/apiKeys/ApiKeysOverview";
import ApiKeysList from "@/components/apiKeys/ApiKeysList";
import { ArrowRight } from "lucide-react";

export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ orgId: string }> | { orgId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await Promise.resolve(params);
  const keys = await getApiKeys(user.id, orgId);

  return (
    <>
      <PageHeader
        title="API Keys"
        description="Manage ingestion credentials used by your backend to authenticate usage events."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/${orgId}/metrics`}>Metrics</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/app/${orgId}/webhooks`}>
                Webhooks
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <CreateApiKeyForm userId={user.id} orgId={orgId} />
          </div>
        }
      />

      {keys.length === 0 ? (
        <ApiKeysEmptyState orgId={orgId} />
      ) : (
        <section className="space-y-6">
          <ApiKeysOverview keys={keys} />
          <ApiKeysList userId={user.id} orgId={orgId} keys={keys} />
        </section>
      )}
    </>
  );
}
