"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteOrganization } from "@/actions/organization/deleteOrganization";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function DangerZone({
  orgId,
  isOwner,
  userId,
}: {
  orgId: string;
  isOwner: boolean;
  userId: string;
}) {
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!isOwner) return null;

  async function handleDelete() {
    if (confirm !== "DELETE") {
      toast.error("Type DELETE to confirm");
      return;
    }

    setLoading(true);

    const res = await deleteOrganization(userId, orgId);

    if (res.success) {
      toast.success("Organization deleted");
      router.push("/app");
    } else {
      toast.error(res.error || "Failed to delete organization");
    }

    setLoading(false);
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-red-700">Danger zone</h3>
        <p className="text-sm text-red-600">
          Deleting this organization is permanent and cannot be undone.
        </p>
      </div>

      <input
        placeholder='Type "DELETE" to confirm'
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm"
      />

      <Button
        variant="destructive"
        onClick={handleDelete}
        disabled={loading}
        className="text-sm font-medium hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Deleting..." : "Delete organization"}
      </Button>
    </div>
  );
}
