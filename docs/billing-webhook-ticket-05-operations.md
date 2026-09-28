# Billing webhook owner replay: ticket 05

An owner can replay one selected endpoint only after its fifth failed attempt is terminal. The webhook logs page requests a reason and starts a new five-attempt cycle. The request carries an idempotency key; repeating it returns the original replay record, while a fresh key is rejected while the cycle is active or after success. A later terminal failure can be replayed with a fresh key.

`BillingWebhookReplay` retains actor, Organization, event, endpoint, reason, cycle, and replay time. The `WebhookDelivery.cycle` column distinguishes old attempts from new ones; no prior attempt row is removed. The worker sends the stored event ID and billing facts. The original event target selection and BillingRecord are unchanged. PostgreSQL work remains authoritative if a queue wakeup is lost, including during an active replay cycle.

Apply the additive migration to disposable PostgreSQL and run `npm run test:billing-webhook-recovery`. The harness exercises a terminal failure, replay, repeated request, mixed target outcomes, membership revocation, and worker delivery with a loopback receiver. Before rollout, reconcile event, work, delivery, and replay counts and inspect any active cycle. The deployed owner finalization and revision gate remains closed.

For application rollback, hide the replay control and stop accepting replay actions. Keep the replay migration, active work cycles, audit rows, and all attempt history. Continue processing active cycles with a worker that understands the cycle-aware attempt key, or pause those workers until that build can resume them. Never reset attempt counts or erase replay evidence to roll back the user interface.
