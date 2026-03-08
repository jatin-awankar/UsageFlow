"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { acceptInvite } from "@/actions/organization/acceptInvite";
import { Button } from "@/components/ui/button";

export default function AcceptInviteButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);

    try {
      const result = await acceptInvite(token);

      if (!result.success) {
        toast.error(result.error || "Unable to accept invitation");
        return;
      }

      toast.success(
        result.alreadyMember
          ? "You are already a member"
          : "Invitation accepted"
      );

      const destination = `/app/${result.orgId}/dashboard`;
      window.location.assign(destination);
    } catch {
      toast.error("Unable to accept invitation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleAccept}
      disabled={loading}
      className="hover:cursor-pointer"
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Accepting...
        </>
      ) : (
        <>
          <CheckCircle2 className="size-4" />
          Accept invitation
        </>
      )}
    </Button>
  );
}
