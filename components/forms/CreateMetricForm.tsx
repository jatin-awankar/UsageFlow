"use client";

import { createMetric } from "@/actions/metrics/createMetric";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function CreateMetricForm({
  userId,
  orgId,
}: {
  userId: string;
  orgId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading]);

  function closeDialog() {
    if (loading) return;
    setOpen(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const result = await createMetric(userId, orgId, {
        name: String(formData.get("name") ?? "").trim(),
        key: String(formData.get("key") ?? "").trim(),
        unit: String(formData.get("unit") ?? "").trim(),
      });

      if (result.success) {
        toast.success("Metric created successfully");
        formRef.current?.reset();
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Something went wrong");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen(true)}
        className="hover:cursor-pointer"
      >
        <Plus className="size-4" />
        New metric
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create metric"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Create metric</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Define a usage dimension your product will report and bill.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={closeDialog}
                className="hover:cursor-pointer"
                disabled={loading}
              >
                <X className="size-4" />
              </Button>
            </div>

            <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Metric name
                </label>
                <input
                  name="name"
                  required
                  disabled={loading}
                  placeholder="API Calls"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:opacity-50"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Metric key
                  </label>
                  <input
                    name="key"
                    required
                    disabled={loading}
                    placeholder="API_CALL"
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm uppercase text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:opacity-50"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Used by ingestion events.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Unit
                  </label>
                  <input
                    name="unit"
                    required
                    disabled={loading}
                    placeholder="calls"
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:opacity-50"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Example: requests, users, events.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={loading}
                  className="hover:cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="hover:cursor-pointer">
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create metric"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
