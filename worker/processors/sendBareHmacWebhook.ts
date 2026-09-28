import axios from "axios";
import { createHmac } from "node:crypto";

export function sendBareHmacWebhook(url: string, secret: string, body: string) {
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  return axios.post(url, body, { headers: { "Content-Type": "application/json",
    "X-UsageFlow-Signature": signature }, timeout: 5000 });
}
