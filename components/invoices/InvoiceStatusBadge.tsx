import { AlertCircle, CheckCircle2, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

function statusToLabel(status: string) {
  return status.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function InvoiceStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();

  if (normalized === "PAID") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="size-3.5" />
        {statusToLabel(status)}
      </span>
    );
  }

  if (normalized === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
        <AlertCircle className="size-3.5" />
        {statusToLabel(status)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        "border-amber-200 bg-amber-50 text-amber-700"
      )}
    >
      <Clock3 className="size-3.5" />
      {statusToLabel(status)}
    </span>
  );
}
