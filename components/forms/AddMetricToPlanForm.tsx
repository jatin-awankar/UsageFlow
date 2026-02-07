"use client";

import { useState } from "react";
import { addMetricToPlan } from "@/actions/plans/addMetricToPlan";
import { toast } from "sonner";

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
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;

    const result = await addMetricToPlan(userId, orgId, {
      planId,
      metricId: form.metricId.value,
      includedUnits: Number(form.includedUnits.value),
      pricePerUnit: Number(form.overagePrice.value),
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
    <form
      onSubmit={onSubmit}
      className="mt-3 flex flex-col space-y-2 border-t pt-3"
    >
      <h4 className="text-sm font-medium">Attach Metric</h4>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <select
        name="metricId"
        disabled={loading}
        required
        className="border border-gray-500 p-2 px-2 disabled:opacity-50"
      >
        <option value="" className="bg-background">
          Select metric
        </option>
        {metrics.map((m) => (
          <option key={m.id} value={m.id} className="bg-background">
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
        className="border border-gray-500 p-1 px-2 disabled:opacity-50"
      />

      <input
        name="overagePrice"
        type="number"
        placeholder="Overage price per unit"
        required
        disabled={loading}
        className="border border-gray-500 p-1 px-2 disabled:opacity-50"
      />

      <button
        disabled={loading}
        className="bg-gray-800 text-gray-50 hover:bg-gray-500 px-3 py-1 hover:cursor-pointer disabled:bg-gray-500"
      >
        {loading ? "Adding..." : "Add Metric"}
      </button>
    </form>
  );
}
