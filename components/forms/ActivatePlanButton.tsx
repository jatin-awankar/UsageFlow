"use client";

import { createSubscription } from "@/actions/subscription/createSubscription";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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

    try {
      const res = await createSubscription(userId, orgId, planId);
      if (res?.success) {
        toast.success("Plan activated successfully");
        router.refresh();
      } else {
        const message =
          res && "error" in res ? res.error : "Failed to activate plan";
        toast.error(message);
      }
    } catch {
      toast.error("Failed to activate plan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={activate}
      disabled={loading}
      className="w-full justify-center hover:cursor-pointer"
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Activating...
        </>
      ) : (
        <>
          <CheckCircle2 className="size-4" />
          Activate plan
        </>
      )}
    </Button>
  );
}
