import { getCurrentUser } from "@/lib/auth/session";
import { getApiKeys } from "@/actions/apiKeys/getApiKeys";
import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import CreateApiKeyForm from "@/components/forms/CreateApiKeyForm";
import RevokeApiKeyButton from "@/components/forms/RevokeApiKeyButton";
import { Key } from "lucide-react";

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
        description="Manage API keys used to authenticate usage ingestion."
        actions={<CreateApiKeyForm userId={user.id} orgId={orgId} />}
      />

      {keys.length === 0 ? (
        <EmptyState
          title="No API keys created"
          description="Create an API key to allow your application to send usage events."
          icon={<Key />}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Name
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Created
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Status
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {k.name}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {new Date(k.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        k.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {k.active ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {k.active && (
                      <RevokeApiKeyButton
                        userId={user.id}
                        apiKeyId={k.id}
                        orgId={orgId}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
