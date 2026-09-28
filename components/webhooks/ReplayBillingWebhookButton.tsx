"use client";

import { useRef, useState } from "react";
import { replayBillingWebhook } from "@/actions/webhooks/replayBillingWebhook";

export default function ReplayBillingWebhookButton({ orgId, eventId, endpointId }: {
  orgId: string; eventId: string; endpointId: string;
}) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const key = useRef<string | null>(null);
  return <form className="mt-2 flex flex-wrap items-center gap-2" onSubmit={async (event) => {
    event.preventDefault();
    if (busy || !reason.trim()) return;
    key.current ??= crypto.randomUUID();
    setBusy(true);
    try {
      await replayBillingWebhook({ orgId, eventId, endpointId, reason, idempotencyKey: key.current });
      setMessage("Replay queued for this endpoint.");
    } catch {
      setMessage("Replay unavailable. Refresh the page and check the target state.");
    } finally { setBusy(false); }
  }}>
    <input aria-label="Replay reason" required maxLength={500} placeholder="Reason for replay"
      value={reason} onChange={(event) => { setReason(event.target.value); key.current = null; }}
      className="rounded border border-slate-300 px-2 py-1" />
    <button type="submit" disabled={busy} className="rounded bg-slate-900 px-3 py-1 text-white disabled:opacity-50">Replay failed endpoint</button>
    {message && <span role="status">{message}</span>}
  </form>;
}
