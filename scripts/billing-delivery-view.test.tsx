import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import BillingDeliveryEvents from "../components/webhooks/BillingDeliveryEvents";
import type { BillingDeliveryEvent } from "../components/webhooks/BillingDeliveryEvents";

function event(status: string, works: BillingDeliveryEvent["billingWebhookWork"]): BillingDeliveryEvent {
  return { id: `event-${status}`, type: "invoice.finalized", status,
    targetEndpointIds: works.map((work) => work.endpointId), billingWebhookWork: works,
    deliveries: [], billingWebhookReplays: [] };
}

const dueAt = new Date("2026-09-28T10:00:00Z");

test("owner sees a terminal failure with safe attempt details", () => {
  const html = renderToStaticMarkup(<BillingDeliveryEvents events={[{
    id: "event-failed", type: "invoice.finalized", status: "FAILED",
    targetEndpointIds: ["endpoint-one"],
    billingWebhookWork: [{ endpointId: "endpoint-one", terminal: true, completedAt: null,
      attemptCount: 5, dueAt: new Date("2026-09-28T10:00:00Z"), cycle: 1 }],
    deliveries: [{ endpointId: "endpoint-one", cycle: 1, attempt: 5, status: "FAILED",
      responseCode: null, safeError: "Request timed out", durationMs: 5000,
      startedAt: new Date("2026-09-28T10:00:00Z") }],
    billingWebhookReplays: [],
  }]} />);
  assert.match(html, /Terminal failure/);
  assert.match(html, /Request timed out/);
  assert.match(html, /5000 ms/);
});

test("no selected endpoint is shown as no target", () => {
  const html = renderToStaticMarkup(<BillingDeliveryEvents events={[event("NO_TARGET", [])]} />);
  assert.match(html, /No target/);
  assert.match(html, /No endpoints were selected/);
});

test("pending endpoint shows the next attempt", () => {
  const html = renderToStaticMarkup(<BillingDeliveryEvents events={[event("PENDING", [
    { endpointId: "pending-endpoint", terminal: false, completedAt: null, attemptCount: 1, dueAt, cycle: 1 },
  ])]} />);
  assert.match(html, /Pending attempt 2/);
});

test("delivered endpoint is shown as delivered", () => {
  const html = renderToStaticMarkup(<BillingDeliveryEvents events={[event("DELIVERED", [
    { endpointId: "delivered-endpoint", terminal: false, completedAt: dueAt, attemptCount: 1, dueAt, cycle: 1 },
  ])]} />);
  assert.match(html, /delivered-endpoint: Delivered/);
});

test("disabled endpoint is shown as skipped", () => {
  const html = renderToStaticMarkup(<BillingDeliveryEvents events={[event("FAILED", [
    { endpointId: "skipped-endpoint", terminal: true, completedAt: dueAt, attemptCount: 1, dueAt, cycle: 1 },
  ])]} />);
  assert.match(html, /skipped-endpoint: Skipped: endpoint disabled/);
});

test("mixed event distinguishes delivered and terminally failed endpoints", () => {
  const html = renderToStaticMarkup(<BillingDeliveryEvents events={[event("MIXED", [
    { endpointId: "delivered-endpoint", terminal: false, completedAt: dueAt, attemptCount: 1, dueAt, cycle: 1 },
    { endpointId: "failed-endpoint", terminal: true, completedAt: null, attemptCount: 5, dueAt, cycle: 1 },
  ])]} />);
  assert.match(html, /Mixed endpoint outcomes/);
  assert.match(html, /delivered-endpoint: Delivered/);
  assert.match(html, /failed-endpoint: Terminal failure/);
});
