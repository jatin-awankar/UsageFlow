"use client";

import { createWebhookEndpoint } from "@/actions/webhooks/createWebhookEndpoint";
import { useRef, useState } from "react";
import { toast } from "sonner";

export default function CreateWebhookForm({ userId, orgId }: { userId: string, orgId: string }) {
    const [secret, setSecret] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const url = formData.get("url") as string;
        const res = await createWebhookEndpoint(userId, orgId, { url, events: ["invoice.created", "subscription.activated"] });

        if (res.success) {
            setSecret(res.data.secret);
            formRef.current?.reset();
        } else {
            toast.error(res.error || "Failed to create webhook endpoint");
        }

        setLoading(false);
    }

    return (
        <div className="p-4 border rounded space-y-3">
            <h2 className="font-medium">Create Webhook</h2>

            <form onSubmit={handleSubmit} ref={formRef} className="flex flex-col space-y-3">
                <input
                    name="url"
                    placeholder="https://example.com/webhook"
                    required
                    disabled={loading}
                    className="border border-gray-500 p-1 px-2 md:w-1/2 disabled:opacity-50"
                />
                <button type="submit" className="md:w-1/2 p-2 border hover:cursor-pointer disabled:bg-gray-500 transition-colors" disabled={loading}>
                    Create
                </button>
            </form>

            {secret && (
                <div className="p-2 rounded text-sm">
                    <p className="font-semibold">Webhook secret (save now):</p>
                    <code className="break-all">{secret}</code>
                </div>
            )}
        </div>
    )
}