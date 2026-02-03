"use client";

import { useState } from "react";
import { createSubscription } from "@/actions/subscription/createSubscription";

export default function ActivatePlanButton({
    userId,
    orgId,
    planId,
}: {
    userId: string;
    orgId: string;
    planId: string;
}) {
    const [loading, setLoading] = useState(false);

    async function activate() {
        setLoading(true);
        await createSubscription(userId, orgId, planId);
        setLoading(false);
        window.location.reload(); // simple & safe for now
    }

    return (
        <button
            onClick={activate}
            disabled={loading}
            className="px-4 py-2 hover:cursor-pointer border disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
            {loading ? "Activating..." : "Activate Plan"}
        </button>
    );
}
