"use client";

import { createMetric } from "@/actions/metrics/createMetric";
import { useState, useRef } from "react"; // Added useRef
import { toast } from "sonner";

export default function CreateMetricForm({
  userId,
  orgId,
}: {
  userId: string;
  orgId: string;
}) {
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createMetric(userId, orgId, {
      name: formData.get("name") as string,
      key: formData.get("key") as string,
      unit: formData.get("unit") as string,
    });

    if (result.success) {
      toast.success("Metric created successfully!");
      formRef.current?.reset();
    } else {
      toast.error(result.error || "An unexpected error occurred");
    }
    
    setLoading(false);
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col space-y-3">
      <input
        name="name"
        disabled={loading}
        placeholder="Metric name"
        required
        className="border border-gray-500 p-1 px-2 md:w-1/2 disabled:opacity-50"
      />
      <input
        name="key"
        disabled={loading}
        placeholder="Metric key (API_CALL)"
        required
        className="border border-gray-500 p-1 px-2 md:w-1/2 disabled:opacity-50"
      />
      <input
        name="unit"
        disabled={loading}
        placeholder="Unit (calls, users)"
        required
        className="border border-gray-500 p-1 px-2 md:w-1/2 disabled:opacity-50"
      />

      <button
        disabled={loading}
        type="submit"
        className="md:w-1/2 p-2 border hover:cursor-pointer disabled:bg-gray-500 transition-colors"
      >
        {loading ? "Creating..." : "Create Metric"}
      </button>
    </form>
  );
}
