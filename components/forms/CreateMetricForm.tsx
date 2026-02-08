"use client";

import { createMetric } from "@/actions/metrics/createMetric";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
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
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const result = await createMetric(userId, orgId, {
      name: formData.get("name") as string,
      key: formData.get("key") as string,
      unit: formData.get("unit") as string,
    });

    if (result.success) {
      toast.success("Metric created successfully");
      formRef.current?.reset();
      router.refresh();
    } else {
      toast.error(result.error || "Something went wrong");
    }

    setLoading(false);
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="rounded-lg border bg-white p-4 space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Metric name
        </label>
        <input
          name="name"
          required
          disabled={loading}
          placeholder="API Calls"
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Metric key
        </label>
        <input
          name="key"
          required
          disabled={loading}
          placeholder="API_CALL"
          className="mt-1 w-full rounded-md border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-gray-500">
          Used by your application when sending usage events.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Unit</label>
        <input
          name="unit"
          required
          disabled={loading}
          placeholder="calls, users, requests"
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-md border bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating…" : "Create metric"}
      </button>
    </form>
  );
}
