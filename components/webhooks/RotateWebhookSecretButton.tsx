"use client";

import { useState } from "react";
import { rotateWebhookSecret } from "@/actions/webhooks/rotateWebhookSecret";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function RotateWebhookSecretButton({ orgId, endpointId }: { orgId: string; endpointId: string }) {
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function rotate() {
    setBusy(true);
    try {
      const result = await rotateWebhookSecret(orgId, endpointId);
      setSecret(result.secret);
      toast.success("Secret rotated. Copy the new value now.");
    } catch { toast.error("Could not rotate endpoint secret"); }
    finally { setBusy(false); }
  }
  return secret ? <div role="dialog" aria-label="New webhook secret" className="space-y-2 rounded border p-3">
    <p className="text-xs">Copy this secret now. It will not be shown again.</p>
    <code className="block break-all text-xs">{secret}</code>
    <Button type="button" size="sm" onClick={() => { setSecret(null); }}>Done</Button>
  </div> : <Button type="button" size="sm" variant="outline" disabled={busy} onClick={rotate}>Rotate secret</Button>;
}
