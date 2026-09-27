"use client";

import { useState } from "react";

type Props = {
  orgId: string; metricId: string; customerId: string; start: string; end: string;
  currency: string; eligibleEventIds: string[];
};

export function ApproveGap(props: Props) {
  const [reviewedAt] = useState(() => new Date().toISOString());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (!props.eligibleEventIds.length) return null;
  return <form className="space-y-3" onSubmit={async (event) => {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/organizations/${props.orgId}/pricing-gap-corrections`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...props, reviewedAt, unitPrice: data.get("unitPrice"), reason: data.get("reason"), evidence: data.get("evidence") }),
      });
      const result = await response.json();
      setMessage(response.ok ? `Correction approved: ${result.correctionId}` : result.error);
    } catch { setMessage("Approval failed. Please retry after reviewing the current gap."); }
    finally { setBusy(false); }
  }}>
    <h2 className="font-semibold">Approve correction for these exact event IDs</h2>
    <label className="block">Approved unit price <input name="unitPrice" required className="block rounded border p-2" /></label>
    <label className="block">Reason <textarea name="reason" required className="block rounded border p-2" /></label>
    <label className="block">Evidence reference or retained evidence <textarea name="evidence" required className="block rounded border p-2" /></label>
    <button disabled={busy} className="rounded border px-4 py-2">Approve correction</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
