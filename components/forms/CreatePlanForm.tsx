"use client";

import React from "react";
import { useState } from "react";
import { createPlan } from "@/actions/plans/createPlan";
import { toast } from "sonner";

export default function CreatePlanForm({
    userId,
    orgId,
}: {
    userId: string;
    orgId: string;
}) {
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const form = e.currentTarget;

        const formData = new FormData(form);
        const result = await createPlan(userId, orgId, {
            name: formData.get("name") as string,
            basePrice: Number(formData.get("basePrice")),
            billingPeriod: "MONTHLY",
        });

        if (result.success) {
            toast.success("Metric created successfully!");
            form.reset();
        } else {
            toast.error(result.error || "An unexpected error occurred");
        }

        setLoading(false);
    }

    return (
        <form className="flex flex-col space-y-3" onSubmit={onSubmit}>
            <input
                name="name"
                disabled={loading}
                placeholder="Plan name"
                required
                className="border border-gray-500 p-1 px-2 md:w-1/2 disabled:opacity-50"
            />
            <input
                name="basePrice"
                disabled={loading}
                type="number"
                placeholder="Base price"
                required
                className="border border-gray-500 p-1 px-2 md:w-1/2 disabled:opacity-50"
            />

            <button
                disabled={loading}
                type="submit"
                className="md:w-1/2 p-2 border hover:cursor-pointer hover:bg-gray-500 disabled:bg-gray-500 transition-colors"
            >
                {loading ? "Creating..." : "Create Plan"}
            </button>
        </form>
    )
}
