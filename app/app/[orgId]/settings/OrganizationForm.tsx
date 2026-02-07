"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateOrganization } from "@/actions/organization/updateOrganization";
import { Button } from "@/components/ui/button";

export default function OrganizationForm({
  orgId,
  initialName,
  userId,
}: {
  orgId: string;
  initialName: string;
  userId: string;
}) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await updateOrganization(orgId, { name }, userId);

    if (res.success) {
      toast.success("Organization updated");
    } else {
      toast.error(res.error || "Failed to update organization");
    }

    setLoading(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border bg-white p-4 space-y-4"
    >
      <div>
        <h3 className="text-sm font-medium text-gray-900">
          Organization profile
        </h3>
        <p className="text-sm text-gray-500">
          Update basic information about your organization.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">
          Organization name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          className="w-full rounded-md border px-3 py-2 text-sm"
          required
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="text-sm font-medium hover:cursor-pointer disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
