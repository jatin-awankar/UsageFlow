"use client";

import { revokeApiKey } from "@/actions/apiKeys/revokeApiKey";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function RevokeApiKeyButton({
  userId,
  apiKeyId,
  orgId,
}: {
  userId: string;
  orgId: string;
  apiKeyId: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function revoke() {
    setLoading(true);

    try {
      const result = await revokeApiKey(userId, orgId, apiKeyId);

      if (result.success) {
        toast.success("API key revoked");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to revoke API key");
      }
    } catch {
      toast.error("Failed to revoke API key");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={revoke}
      disabled={loading}
      className="hover:cursor-pointer"
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Revoking...
        </>
      ) : (
        <>
          <ShieldOff className="size-4" />
          Revoke
        </>
      )}
    </Button>
  );
}
