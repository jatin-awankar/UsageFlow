"use client";

import { revokeApiKey } from "@/actions/apiKeys/revokeApiKey";
import { useState } from "react";
import { toast } from "sonner";

export default function RevokeApiKeyButton({
    userId,
    apiKeyId,
    orgId,
}: {
    userId: string;
    orgId: string;
    apiKeyId: string;
}) {
    const [loading, setLoading] = useState(false);

    async function revoke() {
        setLoading(true);

        const result = await revokeApiKey(userId, orgId, apiKeyId);

        if (result.success) {
            toast.success("ApiKey revoked successfully");
            window.location.reload();
        } else {
            toast.error(result.error || "Error creating ApiKey");
        }

        setLoading(false);
    }

    return (
        <button
            onClick={revoke}
            disabled={loading}
            className="text-red-600 p-2 border hover:cursor-pointer hover:bg-red-300 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors">
            Revoke
        </button>
    );
}

// uf_live_39d7559588a8c628036d143f93484f938a92288b4476d0da