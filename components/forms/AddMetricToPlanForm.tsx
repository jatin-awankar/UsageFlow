"use client";

import { addMetricToPlan } from "@/actions/plans/addMetricToPlan";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

export default function AddMetricToPlanForm({
  userId,
  orgId,
  planId,
  metrics,
}: {
  userId: string;
  orgId: string;
  planId: string;
  metrics: { id: string; name: string; key?: string; unit?: string }[];
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const hasMetrics = metrics.length > 0;
  const firstMetricId = useMemo(() => metrics[0]?.id ?? "", [metrics]);

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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, mounted]);

  function closeDialog() {
    if (loading) return;
    setOpen(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await addMetricToPlan(userId, orgId, {
        planId,
        metricId: String(formData.get("metricId") ?? ""),
        includedUnits: Number(formData.get("includedUnits")),
        pricePerUnit: Number(formData.get("overagePrice")),
      });

      if (result.success) {
        toast.success("Metric attached successfully");
        formRef.current?.reset();
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "An unexpected error occurred");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={!hasMetrics}
        className="w-full justify-center hover:cursor-pointer"
      >
        <Plus className="size-4" />
        {hasMetrics ? "Attach metric" : "All metrics attached"}
      </Button>

      {open && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={closeDialog}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Attach metric"
                className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Attach metric</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Configure included units and overage rate for this plan.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={closeDialog}
                    disabled={loading}
                    className="hover:cursor-pointer"
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Metric</label>
                    <select
                      name="metricId"
                      required
                      defaultValue={firstMetricId}
                      disabled={loading}
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:opacity-50"
                    >
                      {!firstMetricId ? <option value="">Select metric</option> : null}
                      {metrics.map((metric) => (
                        <option key={metric.id} value={metric.id}>
                          {metric.name}
                          {metric.key ? ` (${metric.key})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Included units
                      </label>
                      <input
                        name="includedUnits"
                        type="number"
                        min={0}
                        required
                        disabled={loading}
                        placeholder="1000"
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Overage price / unit
                      </label>
                      <input
                        name="overagePrice"
                        type="number"
                        min={0}
                        required
                        disabled={loading}
                        placeholder="2"
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:opacity-50"
                      />
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
                          Attaching...
                        </>
                      ) : (
                        "Attach metric"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
