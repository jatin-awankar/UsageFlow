"use client";

import { generateManualInvoice } from "@/actions/invoices/generateManualInvoice";
import { Button } from "@/components/ui/button";
import { Loader2, ReceiptText } from "lucide-react";
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
    <Button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      size="sm"
      className="min-w-36 hover:cursor-pointer"
    >
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <ReceiptText className="size-4" />
          Generate Invoice
        </>
      )}
    </Button>
  );
}
