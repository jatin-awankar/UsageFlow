# 06: Create and rotate endpoint secrets with a 24-hour receiver overlap

**What to build:** An authorized Organization owner can create and rotate an endpoint secret without dropping receiver verification during a 24-hour transition.

**Blocked by:** 03: Sign and document the exact billing-event request.

**Status:** resolved

- [x] Create a durable current secret for a new endpoint and expose it once only to an authorized endpoint manager. Rotation creates a new current secret, retains only the immediately previous secret with a 24-hour expiry, and audits the action without secret values.
- [x] UsageFlow signs every new attempt with the current secret. The 24-hour overlap is a **receiver verification contract**: document and demonstrate how a receiver accepts a signature made with the current or immediately previous secret during the overlap, then rejects the previous secret after expiry. Never sign new attempts with the previous secret.
- [x] Check current membership and endpoint Organization at action time. Keep secrets out of ordinary endpoint views, delivery logs, attempt metadata, and audit output.
- [x] In disposable PostgreSQL with a local receiver and controlled time, create and rotate a secret, verify new signatures, accept the immediately previous secret within 24 hours, reject it after expiry, and test forged endpoint IDs and stale membership.
- [x] Validate additive durable secret-state migration and expiry behavior. Document a rollback that retains overlap state until receiver migration is complete; do not silently invalidate active verification. Keep the deployed gate closed.
- [x] Use a dedicated implementation branch, run acceptance checks, commit only this ticket, push, and open a draft PR.

## Comments

- 2026-09-28: Implemented in draft PR [#76](https://github.com/jatin-awankar/UsageFlow/pull/76), still open. Review follow-up extracted the locked owner check and added redaction coverage for endpoint views, delivery logs, billing attempt outcomes, and audit output. The test caught and fixed a full-endpoint leak in delivery logs. Disposable PostgreSQL rotation acceptance, billing webhook recovery acceptance, typecheck, and changed-file lint pass. Repository-wide lint retains an unrelated existing JSX apostrophe failure in `app/app/[orgId]/settings/page.tsx:70`. The deployed finalization gate stays closed.
