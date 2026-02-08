"use client";

import { useState } from "react";
import { toggleWebhook } from "@/actions/webhooks/toggleWebhook";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

export default function ToggleWebhookButton({
  userId,
  orgId,
  webhookEndpointId,
  active,
}: {
  userId: string;
  orgId: string;
  webhookEndpointId: string;
  active: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    setLoading(true);

    const res = await toggleWebhook(userId, orgId, webhookEndpointId, !active);

    if (res.success) {
      toast.success(res.message);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update webhook");
    }

    setLoading(false);
  }

  return (
    <Button
      variant={active ? "destructive" : "default"}
      onClick={handleToggle}
      disabled={loading}
      className="text-sm font-medium disabled:opacity-50"
    >
      {loading ? "Updating…" : active ? "Deactivate" : "Activate"}
    </Button>
  );
}
