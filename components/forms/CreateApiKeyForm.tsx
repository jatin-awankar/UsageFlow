"use client";

import { useRef, useState } from "react";
import { createApiKey } from "@/actions/apiKeys/createApiKey";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";

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
  const router = useRouter();
  const [isCopied, setIsCopied] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = formRef.current!;
    const formData = new FormData(form);

    const name = formData.get("name") as string;

    const result = await createApiKey(name, userId, orgId);

    if (result.success && result.data) {
      toast.success("API key created");
      setRawKey(result.data.rawKey);
      form.reset();
      router.refresh();
    } else {
      toast.error(result.error || "Failed to create API key");
      setRawKey(null);
    }

    setLoading(false);
  }

  const handleCopy = async () => {
    if (rawKey == null) return;
    try {
      await navigator.clipboard.writeText(rawKey);
      setIsCopied(true);
      // Reset the "Copied!" message after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

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

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create
        </button>
      </form>

      {rawKey && (
        <div className="rounded-md border bg-gray-50 p-3 text-sm">
          <p className="font-medium text-gray-900">Copy this key now</p>
          <p className="mt-1 text-xs text-gray-500">
            This key will only be shown once.
          </p>
          <code className="relative mt-2 block break-all rounded bg-white p-2 font-mono text-xs">
            <p>{rawKey}</p>
            <button
              onClick={handleCopy}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 bg-gray-300 border rounded-md hover:cursor-pointer"
            >
              {isCopied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </code>
        </div>
      )}
    </div>
  );
}
