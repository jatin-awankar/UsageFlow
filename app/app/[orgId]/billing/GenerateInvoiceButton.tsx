"use client";

import { generateManualInvoice } from "@/actions/invoices/generateManualInvoice";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

export function GenerateInvoiceButton({
  userId,
  orgId,
  subscriptionId,
}: {
  userId: string;
  orgId: string;
  subscriptionId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      try {
        const res = await generateManualInvoice(userId, orgId, subscriptionId);
        if (res?.success) {
          toast.success("Invoice generated");
          router.refresh();
        } else {
          toast.error(res?.error ?? "Error generating invoice");
        }
      } catch {
        toast.error("Error generating invoice");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center justify-center rounded-md border bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? "Generating..." : "Generate Invoice"}
    </button>
  );
}
