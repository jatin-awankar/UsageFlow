"use client";

import { useState } from "react";
import { createSubscription } from "@/actions/subscription/createSubscription";
import { useRouter } from "next/navigation";

export default function ActivatePlanButton({
  userId,
  orgId,
  planId,
}: {
  userId: string;
  orgId: string;
  planId: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function activate() {
    setLoading(true);
    await createSubscription(userId, orgId, planId);
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={activate}
      disabled={loading}
      className="w-full rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? "Activating…" : "Activate plan"}
    </button>
  );
}
