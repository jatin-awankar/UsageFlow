# 02: Owner creates a Customer

**What to build:** An Organization owner can create a billed Customer with an immutable external customer ID. The same ID can exist in another Organization, but a duplicate within one Organization is rejected.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The owner-facing path creates a Customer under the selected Organization and enforces OWNER authorization on the server, including for a User in two Organizations.
- [ ] A non-owner creation attempt, blank or whitespace-padded external ID, and same-Organization duplicate are rejected without creating a Customer.
- [ ] Two Organizations may create Customers with the same external ID without sharing identity or access.
- [ ] The database protects Organization ownership, uniqueness, and identity immutability; deactivation retains the external ID for that Customer.
- [ ] Synthetic PostgreSQL and owner-path tests cover the behavior. Existing raw identifier columns and legacy rows remain unchanged; no backfill runs.
