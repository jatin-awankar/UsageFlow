"use client";

import { markInvoiceFailed } from "@/actions/invoices/markInvoiceFailed";
import { markInvoicePaid } from "@/actions/invoices/markInvoicePaid";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, ShieldX } from "lucide-react";
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
    <div className="flex flex-wrap gap-3">
      <Button
        type="button"
        onClick={handlePaid}
        disabled={isPending}
        className="min-w-36 hover:cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Updating...
          </>
        ) : (
          <>
            <CheckCircle2 className="size-4" />
            Mark as paid
          </>
        )}
      </Button>

      <Button
        type="button"
        onClick={handleFailed}
        disabled={isPending}
        variant="outline"
        className="min-w-36 hover:cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Updating...
          </>
        ) : (
          <>
            <ShieldX className="size-4" />
            Mark as failed
          </>
        )}
      </Button>
    </div>
  );
}
