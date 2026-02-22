"use client";

import { createApiKey } from "@/actions/apiKeys/createApiKey";
import { Button } from "@/components/ui/button";
import { Check, Copy, Eye, KeyRound, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

export default function CreateApiKeyForm({
  userId,
  orgId,
}: {
  userId: string;
  orgId: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) {
        setOpen(false);
        setRawKey(null);
        setCreatedName("");
        setIsCopied(false);
        formRef.current?.reset();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading]);

  useEffect(() => {
    if (!mounted || !open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, mounted]);

  function resetState() {
    setRawKey(null);
    setCreatedName("");
    setIsCopied(false);
    formRef.current?.reset();
  }

  function closeDialog() {
    if (loading) return;
    setOpen(false);
    resetState();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "").trim();

    try {
      const result = await createApiKey(name, userId, orgId);

      if (result.success && result.data) {
        toast.success("API key created");
        setCreatedName(name);
        setRawKey(result.data.rawKey);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create API key");
      }
    } catch {
      toast.error("Failed to create API key");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!rawKey) return;

    try {
      await navigator.clipboard.writeText(rawKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1800);
    } catch {
      toast.error("Failed to copy API key");
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
        New API key
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
                aria-label="Create API key"
                className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Create API key</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Generate a server-side key for usage ingestion authentication.
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

                {rawKey ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <p className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                        <KeyRound className="size-4" />
                        Key ready for {createdName || "new credential"}
                      </p>
                      <p className="mt-1 text-xs text-emerald-700">
                        This is the only time the raw key will be shown. Copy and store it securely.
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Raw key
                      </p>
                      <div className="flex items-start gap-2">
                        <code className="flex-1 break-all rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800">
                          {rawKey}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCopy}
                          className="shrink-0 hover:cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="size-4" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="size-4" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        onClick={closeDialog}
                        className="hover:cursor-pointer"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Key name
                      </label>
                      <input
                        name="name"
                        required
                        disabled={loading}
                        placeholder="Ingestion worker"
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:opacity-50"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Use a descriptive name so revocation is safer later.
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 text-xs text-slate-600">
                      <p className="flex items-center gap-2 font-medium text-slate-700">
                        <Eye className="size-3.5" />
                        One-time visibility
                      </p>
                      <p className="mt-1">
                        Raw keys are hashed at rest and cannot be viewed again after this step.
                      </p>
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
                          "Create key"
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
