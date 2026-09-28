# 03: Sign and document the exact billing-event request

**What to build:** An integrator receives a deterministic billing-event JSON body and can authenticate its exact raw bytes and timestamp with the endpoint secret, then deduplicate by stable event ID.

**Blocked by:** 01: Deliver a committed BillingRecord event to selected endpoints.

**Status:** ready-for-agent

- [ ] For `invoice.finalized` and `invoice.revised`, send immutable event ID, type, creation time, and stored billing payload as one deterministic JSON byte sequence. Repeated attempts and replay keep the event ID and billing facts.
- [ ] Send Unix seconds in `X-UsageFlow-Timestamp` and `v1=<lowercase hex HMAC-SHA256>` in `X-UsageFlow-Signature`, signing UTF-8 bytes of `<timestamp>.<raw request body>` with the endpoint secret.
- [ ] Publish a runnable receiver verification example that checks raw bytes before JSON parsing, rejects malformed inputs and timestamps more than 300 seconds old or in the future, compares decoded digests in constant time, and deduplicates by event ID.
- [ ] Loopback receiver acceptance tests capture exact bytes and headers; independently alter body, timestamp, and signature, test both five-minute boundaries, and confirm valid requests and stable facts. Document this event-specific change and receiver migration from the legacy bare-hex signature without changing legacy events.
- [ ] If a compatibility rollback is needed, document receiver coordination before restoring the old sender; preserve the durable event and target state. Keep the deployed gate closed.
- [ ] Use a dedicated implementation branch, run acceptance checks, commit only this ticket, push, and open a draft PR.
