import express from "express";
import crypto from "node:crypto";
import { verifyBillingRequest } from "./billing-verifier.js";

const app = express();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) throw new Error("WEBHOOK_SECRET is not configured");

// Use a durable unique event-ID constraint in production and commit it with
// the work caused by the event. This Set demonstrates the deduplication flow.
const processedBillingEventIds = new Set();
app.post("/billing-webhook", express.raw({ type: "application/json" }), (req, res) => {
  const event = verifyBillingRequest(req.body, req.get("X-UsageFlow-Timestamp"),
    req.get("X-UsageFlow-Signature"), WEBHOOK_SECRET);
  if (!event) return res.status(401).send("Invalid billing signature or request");
  if (processedBillingEventIds.has(event.id)) return res.status(200).send("Already processed");
  // Process the verified event and durably record its ID in one transaction.
  processedBillingEventIds.add(event.id);
  return res.status(200).send("Billing event received");
});

// Legacy event protocol: bare hex HMAC over the raw JSON body.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.post("/webhook", (req, res) => {
  const signature = req.headers["x-usageflow-signature"];
  if (!signature) return res.status(401).send("Missing signature");
  const expectedSignature = crypto.createHmac("sha256", WEBHOOK_SECRET)
    .update(req.rawBody).digest("hex");
  if (signature !== expectedSignature) return res.status(401).send("Invalid signature");
  console.log("Webhook verified");
  console.log("Event type:", req.body.type);
  console.log("Payload:", req.body.data);
  return res.status(200).send("Webhook received");
});

app.listen(4000, () => {
  console.log("Webhook receiver running on http://localhost:4000/webhook");
});
