"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Lock,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteOrganization } from "@/actions/organization/deleteOrganization";
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

  const readyToDelete = confirm === "DELETE";

  async function handleDelete() {
    if (!readyToDelete) {
      toast.error('Type "DELETE" to confirm');
      return;
    }

    setLoading(true);

    try {
      const result = await deleteOrganization(userId, orgId);

      if (!result.success) {
        toast.error(result.error || "Failed to delete organization");
        return;
      }

      toast.success("Organization deleted");
      router.push("/app");
      router.refresh();
    } catch {
      toast.error("Failed to delete organization");
    } finally {
      setLoading(false);
    }
  }

  if (!isOwner) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-md shadow-slate-900/5 animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:160ms]">
        <div className="mb-3 flex items-start gap-3">
          <span className="inline-flex rounded-lg bg-slate-100 p-2 text-slate-600">
            <Lock className="size-4" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Danger zone
            </h3>
            <p className="text-sm text-slate-500">
              Destructive actions are restricted to organization owners.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600">
          Admins can manage profile and access settings, but cannot permanently
          delete this organization.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-rose-300/80 bg-linear-to-b from-rose-100/75 via-rose-50/80 to-white p-5 shadow-md shadow-rose-900/10 animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:160ms]">
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex rounded-lg bg-rose-100 p-2 text-rose-700">
          <ShieldAlert className="size-4" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-rose-900">Danger zone</h3>
          <p className="text-sm text-rose-700/85">
            Deleting this organization is permanent and cannot be undone.
          </p>
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-rose-200 bg-white/90 p-3 text-xs text-rose-700">
        <p className="flex items-center gap-1.5 font-medium">
          <AlertTriangle className="size-3.5" />
          This removes plans, metrics, API keys, billing records, and team
          access.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-rose-900">
          Type DELETE to confirm
        </label>
        <input
          placeholder='Type "DELETE" to confirm'
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          disabled={loading}
          className="w-full rounded-md border border-rose-300 bg-white px-3 py-2 text-sm text-rose-900 placeholder:text-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:opacity-50"
        />
      </div>

      <div className="mt-4 flex items-center justify-end">
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={loading || !readyToDelete}
          className="hover:cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="size-4" />
              Delete organization
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
