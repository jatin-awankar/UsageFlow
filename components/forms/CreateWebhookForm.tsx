"use client";

import { createWebhookEndpoint } from "@/actions/webhooks/createWebhookEndpoint";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

export default function CreateWebhookForm({
  userId,
  orgId,
}: {
  userId: string;
  orgId: string;
}) {
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const url = formData.get("url") as string;

    const res = await createWebhookEndpoint(userId, orgId, {
      url,
      events: ["invoice.created", "subscription.activated"],
    });

    if (res.success && res.data) {
      toast.success("Webhook created");
      setSecret(res.data.secret);
      form.reset();
      router.refresh();
    } else {
      toast.error(res.error || "Failed to create webhook");
    }

    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleSubmit}
        ref={formRef}
        className="flex items-center gap-2"
      >
        <input
          name="url"
          required
          disabled={loading}
          placeholder="https://example.com/webhook"
          className="w-72 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create
        </button>
      </form>

      {secret && (
        <div className="rounded-md border bg-gray-50 p-3 text-sm">
          <p className="font-medium text-gray-900">Webhook secret</p>
          <p className="mt-1 text-xs text-gray-500">
            This secret will only be shown once. Save it securely.
          </p>
          <code className="mt-2 block break-all rounded bg-white p-2 font-mono text-xs">
            {secret}
          </code>
        </div>
      )}
    </div>
  );
}
