"use client";

import { useState } from "react";
import { toggleWebhook } from "@/actions/webhooks/toggleWebhook";
import { toast } from "sonner";

type ToggleWebhookButtonProps = {
    userId: string;
    orgId: string;
    webhookEndpointId: string;
    active: boolean;
};

export default function ToggleWebhookButton({
    userId,
    orgId,
    webhookEndpointId,
    active,
}: ToggleWebhookButtonProps) {
    const [loading, setLoading] = useState(false);

    async function handleToggle() {
        setLoading(true);

        try {
            const res = await toggleWebhook(
                userId,
                orgId,
                webhookEndpointId,
                !active
            );
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.error);
            }
        } catch (err) {
            console.error("Failed to toggle webhook", err);
            alert("Failed to update webhook status");
        } finally {
            setLoading(false);
            window.location.reload(); // safe & simple for now
        }
    }

    return (
        <button
            onClick={handleToggle}
            disabled={loading}
            className={`px-3 py-1 rounded text-sm hover:cursor-pointer ${active
                ? "bg-red-100 text-red-700"
                : "bg-blue-100 text-blue-700"
                }`}
        >
            {loading
                ? "Updating..."
                : active
                    ? "Deactivate"
                    : "Activate"}
        </button>
    );
}
