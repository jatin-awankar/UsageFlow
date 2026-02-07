"use client";

import { useRef, useState } from "react";
import { createApiKey } from "@/actions/apiKeys/createApiKey";
import { toast } from "sonner";
import { Button } from "../ui/button";

export default function CreateApiKeyForm({
  userId,
  orgId,
}: {
  userId: string;
  orgId: string;
}) {
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    const result = await createApiKey(name, userId, orgId);

    if (result.success && result.data) {
      toast.success("API key created");
      setRawKey(result.data.rawKey);
      formRef.current?.reset();
    } else {
      toast.error(result.error || "Failed to create API key");
      setRawKey(null);
    }

    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="flex items-center gap-2"
      >
        <input
          name="name"
          required
          disabled={loading}
          placeholder="Key name"
          className="w-48 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
        />

        <Button
          type="submit"
          disabled={loading}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 hover:cursor-pointer disabled:opacity-50"
        >
          Create
        </Button>
      </form>

      {rawKey && (
        <div className="rounded-md border bg-gray-50 p-3 text-sm">
          <p className="font-medium text-gray-900">Copy this key now</p>
          <p className="mt-1 text-xs text-gray-500">
            This key will only be shown once.
          </p>
          <code className="mt-2 block break-all rounded bg-white p-2 font-mono text-xs">
            {rawKey}
          </code>
        </div>
      )}
    </div>
  );
}
