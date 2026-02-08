"use client";

import { revokeApiKey } from "@/actions/apiKeys/revokeApiKey";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

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

    const result = await revokeApiKey(userId, orgId, apiKeyId);

    if (result.success) {
      toast.success("API key revoked");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to revoke API key");
    }

    setLoading(false);
  }

  return (
    <Button
      variant="destructive"
      onClick={revoke}
      disabled={loading}
      className="text-sm font-medium hover:cursor-pointer disabled:opacity-50"
    >
      Revoke
    </Button>
  );
}
