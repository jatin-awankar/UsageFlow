import { getCurrentUser } from "@/lib/auth/session";
import { getApiKeys } from "@/actions/apiKeys/getApiKeys";
import CreateApiKeyForm from "@/components/forms/CreateApiKeyForm";
import RevokeApiKeyButton from "@/components/forms/RevokeApiKeyButton";
import { redirect } from "next/navigation";

export default async function ApiKeysPage({
    params,
}: {
    params: { orgId: string };
}) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const { orgId } = await params;

    const keys = await getApiKeys(user.id, orgId);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-semibold">API Keys</h1>

            <CreateApiKeyForm userId={user.id} orgId={orgId} />

            {keys.length === 0 ? (
                <div className="border rounded p-6 text-gray-600">
                    <p className="font-medium">No ApiKeys</p>
                    <p className="text-sm mt-1">
                        Create your first ApiKey
                    </p>
                </div>
            ) : (
                <>
                    <table className="w-full border">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Name</th>
                                <th className="p-2 text-left">Created</th>
                                <th className="p-2 text-left">Status</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {keys.map((k) => (
                                <tr key={k.id} className="border-b">
                                    <td className="p-2">{k.name}</td>
                                    <td className="p-2">
                                        {new Date(k.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-2">
                                        {k.active ? "Active" : "Revoked"}
                                    </td>
                                    <td className="p-2">
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
                </>
            )}
        </div>
    );
}
