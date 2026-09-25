# 01: Inventory and classify legacy identifiers

**What to build:** A read-only, reconciled inventory of existing Organization, Subscription, UsageEvent, and invoice records so historical customer identifiers can be classified without assigning any Customer or changing data.

**Blocked by:** A verified recent restored database copy and a read-only inventory connection (external prerequisites).

**Status:** ready-for-agent

- [ ] Verify and record the copy's source and capture time, and confirm the connection can only read.
- [ ] Run the documented inventory and independently reconcile per-Organization and total counts for Organizations, Subscriptions, UsageEvents, and invoices.
- [ ] Report missing, blank, User-ID-matching, and otherwise unverified identifiers without exposing raw customer identifiers or connection details.
- [ ] Classify ambiguous records without inferring a Customer from `Subscription.externalCustomerId` or writing mappings.
- [ ] Record unresolved attribution questions for a later Customer billing design. No backfill or historical invoice attribution is performed.
