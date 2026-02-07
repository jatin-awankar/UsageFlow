"use client";

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

    const formData = new FormData(e.currentTarget);

    const result = await createPlan(userId, orgId, {
      name: formData.get("name") as string,
      basePrice: Number(formData.get("basePrice")),
      billingPeriod: "MONTHLY",
    });

    if (result.success) {
      toast.success("Plan created");
      e.currentTarget.reset();
    } else {
      toast.error(result.error || "Failed to create plan");
    }

    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <input
        name="name"
        required
        placeholder="Plan name"
        disabled={loading}
        className="w-40 rounded-md border px-3 py-2 text-sm"
      />
      <input
        name="basePrice"
        type="number"
        required
        placeholder="Base price"
        disabled={loading}
        className="w-32 rounded-md border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        Create
      </button>
    </form>
  );
}
