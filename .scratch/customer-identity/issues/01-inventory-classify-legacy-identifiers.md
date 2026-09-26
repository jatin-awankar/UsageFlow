# 01: Inventory and classify legacy identifiers

**What to build:** A read-only, reconciled inventory of existing Organization, Subscription, UsageEvent, and invoice records so historical customer identifiers can be classified without assigning any Customer or changing data.

**Prerequisites met:** A recent Prisma Postgres backup was restored into a separate local database, and a read-only inventory connection was verified.

**Status:** ready-for-human

- [x] Verify and record the copy's source and capture time, and confirm the connection can only read.
- [x] Run the documented inventory and independently reconcile per-Organization and total counts for Organizations, Subscriptions, UsageEvents, and invoices.
- [x] Report missing, blank, User-ID-matching, and otherwise unverified identifiers without exposing raw customer identifiers or connection details.
- [x] Classify ambiguous records without inferring a Customer from `Subscription.externalCustomerId` or writing mappings.
- [x] Record unresolved attribution questions for a later Customer billing design. No backfill or historical invoice attribution is performed.

## Execution record

On 2026-09-26, an operator-created Prisma Postgres custom-format backup was verified and restored into an isolated local PostgreSQL database. The backup archive records its creation time and database name; it does not record the source host. Source attribution rests on the project's direct Prisma Postgres connection configuration and the operator's dump command. The backup checksum, capture time, inventory, and reconciliation evidence are retained privately outside this repository.

The inventory used a dedicated role with SELECT access and default read-only transactions. Independent per-Organization and whole-table counts matched the inventory for Organization, Subscription, UsageEvent, and Invoice. Identifier categories also partitioned each Organization's subscription and usage-event counts. No historical identifier was assigned to a billed Customer, and no backfill or invoice attribution was performed.

## Comments

- What source-system evidence maps each otherwise unverified event identifier to a billed Customer within its Organization?
- Were User-ID-shaped event identifiers intended to reference users or customers, and what independent evidence distinguishes them?
- How should events with missing identifiers be treated in a later Customer billing design?
- Which historical subscriptions or invoices have independent evidence of Customer attribution?
- Which sender-side event counts and invoice records should be reconciled before any migration?
