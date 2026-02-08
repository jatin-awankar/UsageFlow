"use client";

import { useFormStatus } from "react-dom";

export function CreateOrgForm({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  const { pending } = useFormStatus();

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Organization name</label>
        <input
          name="name"
          placeholder="e.g. UsageFlow Labs"
          required
          disabled={pending}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      <button
        disabled={pending}
        className="w-full bg-black text-white rounded-md py-2 text-sm font-medium hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Creating..." : "Create organization"}
      </button>
    </form>
  );
}
