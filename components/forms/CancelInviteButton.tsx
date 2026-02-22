"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cancelInvite } from "@/actions/members/cancelInvite";
import { Button } from "@/components/ui/button";

export default function CancelInviteButton({
  orgId,
  inviteId,
}: {
  orgId: string;
  inviteId: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCancel() {
    setLoading(true);

    try {
      const result = await cancelInvite(orgId, inviteId);

      if (!result.success) {
        toast.error(result.error || "Failed to cancel invite");
        return;
      }

      toast.success("Invitation canceled");
      router.refresh();
    } catch {
      toast.error("Failed to cancel invite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleCancel}
      disabled={loading}
      className="hover:cursor-pointer"
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Canceling...
        </>
      ) : (
        <>
          <Trash2 className="size-4" />
          Cancel
        </>
      )}
    </Button>
  );
}
