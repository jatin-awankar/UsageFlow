import express from "express";
import crypto from "crypto";

const app = express();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  throw new Error("WEBHOOK_SECRET is not configured");
}

/**
 * ⚠️ IMPORTANT:
 * We need RAW body for signature verification
 * NOT parsed JSON
 */
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.post("/webhook", (req, res) => {
  const signature = req.headers["x-usageflow-signature"];

  if (!signature) {
    console.log("Missing signature");
    return res.status(401).send("Missing signature");
  }

  /**
   * Signature verification
   */
  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest("hex");

  if (signature !== expectedSignature) {
    console.log("Invalid signature");
    return res.status(401).send("Invalid signature");
  }

  /**
   * Payload is now trusted
   */
  console.log("Webhook verified");
  console.log("Event type:", req.body.type);
  console.log("Payload:", req.body.data);

  /**
   * Respond SUCCESS
   * Any 2xx = success
   */
  res.status(200).send("Webhook received");
});

app.listen(4000, () => {
  console.log("Webhook receiver running on http://localhost:4000/webhook");
});
