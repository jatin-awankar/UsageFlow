"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createOrganization } from "@/actions/organization/createOrganization";
import { Button } from "@/components/ui/button";

export default function CreateOrgForm({
  userId,
  initialError,
}: {
  userId: string;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();

    if (!name) {
      setError("Organization name is required");
      setLoading(false);
      return;
    }

    const result = await createOrganization({ name }, userId);

    if (result.success && result.data?.id) {
      router.push(`/app/${result.data.id}/dashboard`);
      router.refresh();
      return;
    }

    const message =
      result.error ||
      ("error" in result ? result.error : null) ||
      "Failed to create organization";

    setError(message);
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Organization name</label>
        <input
          name="name"
          placeholder="e.g. UsageFlow Labs"
          required
          disabled={loading}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:opacity-50"
        />
      </div>

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={loading} className="w-full hover:cursor-pointer">
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Plus className="size-4" />
            Create organization
          </>
        )}
      </Button>
    </form>
  );
}
