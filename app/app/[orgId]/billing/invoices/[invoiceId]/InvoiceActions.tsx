"use client";

import { markInvoiceFailed } from "@/actions/invoices/markInvoiceFailed";
import { markInvoicePaid } from "@/actions/invoices/markInvoicePaid";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

export function InvoiceActions({
  userId,
  orgId,
  invoiceId,
}: {
  userId: string;
  orgId: string;
  invoiceId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handlePaid() {
    startTransition(async () => {
      try {
        await markInvoicePaid(userId, orgId, invoiceId);
        toast.success("Invoice marked as paid");
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to update invoice";
        toast.error(msg);
      }
    });
  }

  function handleFailed() {
    startTransition(async () => {
      try {
        const res = await markInvoiceFailed(userId, orgId, invoiceId);
        if (res?.success) {
          toast.success("Invoice marked as failed");
          router.refresh();
        } else {
          toast.error(res?.error ?? "Failed to update invoice");
        }
      } catch {
        toast.error("Failed to update invoice");
      }
    });
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={handlePaid}
        disabled={isPending}
        className="bg-black text-white rounded-md py-2 px-4 hover:bg-gray-800 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Mark as paid
      </button>

      <button
        onClick={handleFailed}
        disabled={isPending}
        className="border px-4 py-2 rounded hover:bg-gray-200 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Mark as failed
      </button>
    </div>
  );
}
