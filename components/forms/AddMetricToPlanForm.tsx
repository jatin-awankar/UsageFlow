"use client";

import { useState } from "react";
import { addMetricToPlan } from "@/actions/plans/addMetricToPlan";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function AddMetricToPlanForm({
  userId,
  orgId,
  planId,
  metrics,
}: {
  userId: string;
  orgId: string;
  planId: string;
  metrics: { id: string; name: string }[];
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const result = await addMetricToPlan(userId, orgId, {
      planId,
      metricId: formData.get("metricId") as string,
      includedUnits: Number(formData.get("includedUnits")),
      pricePerUnit: Number(formData.get("overagePrice")),
    });

    if (result.success) {
      toast.success("Metric attached successfully");
      form.reset();
      router.refresh();
    } else {
      toast.error(result.error || "An unexpected error occurred");
    }

    setLoading(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 flex flex-col space-y-2 border-t pt-3"
    >
      <h4 className="text-sm font-medium">Attach Metric</h4>

      <select
        name="metricId"
        disabled={loading}
        required
        className="border p-2 disabled:opacity-50"
      >
        <option value="">Select metric</option>
        {metrics.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      <input
        name="includedUnits"
        type="number"
        placeholder="Included units"
        required
        disabled={loading}
        className="border p-2 disabled:opacity-50"
      />

      <input
        name="overagePrice"
        type="number"
        placeholder="Overage price per unit"
        required
        disabled={loading}
        className="border p-2 disabled:opacity-50"
      />

      <button
        disabled={loading}
        className="bg-gray-800 text-white px-3 py-2 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Adding..." : "Add Metric"}
      </button>
    </form>
  );
}
