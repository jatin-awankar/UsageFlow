# 02: Owner creates a Customer

**What to build:** An Organization owner can create a billed Customer with an immutable external customer ID. The same ID can exist in another Organization, but a duplicate within one Organization is rejected.

**Blocked by:** None (can start immediately).

**Status:** ready-for-human

- [x] The owner-facing path creates a Customer under the selected Organization and enforces OWNER authorization on the server, including for a User in two Organizations.
- [x] A non-owner creation attempt, blank or whitespace-padded external ID, and same-Organization duplicate are rejected without creating a Customer.
- [x] Two Organizations may create Customers with the same external ID without sharing identity or access.
- [x] The database protects Organization ownership, uniqueness, and identity immutability; deactivation retains the external ID for that Customer.
- [x] Synthetic PostgreSQL and owner-path tests cover the behavior. Existing raw identifier columns and legacy rows remain unchanged; no backfill runs.

## Execution record

The Customer creation implementation was merged into `main` in PR #30. Synthetic PostgreSQL and owner-path browser tests passed on 2026-09-26; the additional acceptance tests are in draft PR #32 for human review. No legacy backfill was run.
