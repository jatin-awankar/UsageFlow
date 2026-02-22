"use client";

import { useState } from "react";
import { Building2, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateOrganization } from "@/actions/organization/updateOrganization";
import { Button } from "@/components/ui/button";

export default function OrganizationForm({
  orgId,
  initialName,
  userId,
}: {
  orgId: string;
  initialName: string;
  userId: string;
}) {
  const trimmedInitial = initialName.trim();

  const [name, setName] = useState(trimmedInitial);
  const [savedName, setSavedName] = useState(trimmedInitial);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const normalizedName = name.trim();
  const hasChanges = normalizedName !== savedName;
  const isInvalid = normalizedName.length < 2;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!hasChanges || isInvalid) return;

    setLoading(true);

    try {
      const result = await updateOrganization(orgId, { name: normalizedName }, userId);

      if (!result.success) {
        toast.error(result.error || "Failed to update organization");
        return;
      }

      setSavedName(normalizedName);
      setName(normalizedName);
      toast.success("Organization updated");
      router.refresh();
    } catch {
      toast.error("Failed to update organization");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:100ms]"
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex rounded-lg bg-slate-100 p-2 text-slate-600">
          <Building2 className="size-4" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-slate-900">Organization profile</h3>
          <p className="text-sm text-slate-500">
            Update your workspace name as it appears across the dashboard.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Organization name</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={loading}
          maxLength={100}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:opacity-50"
          required
        />
        <div className="flex items-center justify-between text-xs">
          <p className={isInvalid ? "text-rose-600" : "text-slate-500"}>
            {isInvalid
              ? "Name must be at least 2 characters"
              : hasChanges
                ? "Unsaved changes"
                : "No pending changes"}
          </p>
          <p className="text-slate-400">{normalizedName.length}/100</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end">
        <Button
          type="submit"
          disabled={loading || !hasChanges || isInvalid}
          className="hover:cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
