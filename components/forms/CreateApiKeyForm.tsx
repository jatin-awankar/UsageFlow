"use client";

import { useRef, useState } from "react";
import { createApiKey } from "@/actions/apiKeys/createApiKey";
import { toast } from "sonner";

export default function CreateApiKeyForm({
    userId,
    orgId,
}: {
    userId: string;
    orgId: string;
}) {
    const [rawKey, setRawKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string
        const result = await createApiKey(
            name,
            userId,
            orgId,
        );

        if (result.success && result.data) {
            toast.success("ApiKey created successfully");
            setRawKey(result.data.rawKey);
            formRef.current?.reset();
        } else {
            toast.error(result.error || "Error creating ApiKey");
            setRawKey(null);
        }

        setLoading(false);
    }

    return (
        <div className="p-4 border rounded space-y-3 md:w-1/2">
            <h2 className="font-medium">Create API Key</h2>

            <form onSubmit={onSubmit} className="flex flex-col space-y-3">
                <input
                    name="name"
                    disabled={loading}
                    placeholder="Key name"
                    required
                    className="border border-gray-500 p-1 px-2 disabled:opacity-50" />
                <button
                    disabled={loading}
                    type="submit"
                    className="p-2 border hover:cursor-pointer hover:bg-gray-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? "Creating..." : "Create ApiKey"}
                </button>
            </form>

            {rawKey && (
                <div className="bg-gray-500 p-2 rounded text-sm">
                    <p className="font-semibold">Copy this key now:</p>
                    <code className="break-all">{rawKey}</code>
                </div>
            )}
        </div>
    );
}
