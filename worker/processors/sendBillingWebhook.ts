import axios from "axios";
import { createHmac } from "node:crypto";

export function sendBillingWebhook(url: string, secret: string, body: Buffer, timestamp = Math.floor(Date.now() / 1000)) {
  const time = String(timestamp);
  const signature = createHmac("sha256", secret).update(time).update(".").update(body).digest("hex");
  return axios.post(url, body, { headers: { "Content-Type": "application/json",
    "X-UsageFlow-Timestamp": time, "X-UsageFlow-Signature": `v1=${signature}` }, timeout: 5000 });
}
