"use client";

import { useTransition } from "react";
import { markInvoicePaid } from "@/actions/invoices/markInvoicePaid";
import { markInvoiceFailed } from "@/actions/invoices/markInvoiceFailed";
import { useRouter } from "next/navigation";

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
      await markInvoicePaid(userId, orgId, invoiceId);
      router.refresh();
    });
  }

  function handleFailed() {
    startTransition(async () => {
      await markInvoiceFailed(userId, orgId, invoiceId);
      router.refresh();
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
