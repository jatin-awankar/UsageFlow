"use client";

import { useState } from "react";
import { toggleWebhook } from "@/actions/webhooks/toggleWebhook";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Power, PowerOff } from "lucide-react";

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

    try {
      const res = await toggleWebhook(userId, orgId, webhookEndpointId, !active);

      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update webhook");
      }
    } catch {
      toast.error("Failed to update webhook");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={active ? "destructive" : "default"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="hover:cursor-pointer"
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Updating...
        </>
      ) : active ? (
        <>
          <PowerOff className="size-4" />
          Deactivate
        </>
      ) : (
        <>
          <Power className="size-4" />
          Activate
        </>
      )}
    </Button>
  );
}
