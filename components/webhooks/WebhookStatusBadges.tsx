import { AlertCircle, CheckCircle2, Clock3, Power, PowerOff } from "lucide-react";

function toSentenceCase(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function WebhookEndpointStatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <Power className="size-3.5" />
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
      <PowerOff className="size-3.5" />
      Inactive
    </span>
  );
}

export function WebhookDeliveryStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();

  if (normalized === "SUCCESS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="size-3.5" />
        Success
      </span>
    );
  }

  if (normalized === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
        <AlertCircle className="size-3.5" />
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
      <Clock3 className="size-3.5" />
      {toSentenceCase(status)}
    </span>
  );
}
