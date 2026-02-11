"use client";

import { createOrganization } from "@/actions/organization/createOrganization";
import { redirect } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function CreateOrgForm({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = formData.get("name") as string;
    const result = await createOrganization({ name }, userId);

    if (result.success) {
      form.reset();
      setLoading(false);
      redirect(`/app/${result.data?.id}/dashboard`);
    } else if ("error" in result) {
      const errorParam =
        result.error === "An organization with this name already exists"
          ? "duplicate"
          : "failed";
      setLoading(false);
      redirect(`/onboarding/create-org?error=${errorParam}`);
    } else {
      toast.error(result.error || "Failed to create plan");
    }

    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Organization name</label>
        <input
          name="name"
          placeholder="e.g. UsageFlow Labs"
          required
          disabled={loading}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      <button
        disabled={loading}
        className="w-full bg-black text-white rounded-md py-2 text-sm font-medium hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating..." : "Create organization"}
      </button>
    </form>
  );
}
