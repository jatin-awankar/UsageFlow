# 08: Verify delivery and recovery readiness with the deployed gate closed

**What to build:** The team has a repeatable local evidence package for deciding whether BillingRecord delivery and recovery are ready for a separate rollout decision. This ticket does not enable owner finalization or revision in pilot or production traffic.

**Blocked by:** 02: Recover delivery from PostgreSQL after queue loss or worker crash; 03: Sign and document the exact billing-event request; 04: Bound retries and expose attempt history and terminal failure; 05: Replay one terminally failed endpoint; 06: Create and rotate endpoint secrets with a 24-hour receiver overlap; 07: Give owners an Organization-scoped delivery view.

**Status:** resolved

- [x] Run the real application and worker against disposable PostgreSQL and local Redis with a loopback receiver. Through the nonproduction owner gate, finalize and revise, then verify one committed event per version, target selection or no-target outcome, exact-body HMAC, retries, recovery, replay, rotation, owner visibility, and tenant isolation.
- [x] Prove recovery after Redis job loss and crashes before selection, before HTTP send, and after receiver acceptance but before recording success. Duplicates retain event ID and billing facts; no recovery path repeats the underlying billing action.
- [x] Rehearse migration validation and documented application rollback on a disposable database, retaining committed event and attempt evidence. Check legacy Invoice rows and legacy webhook behavior remain unchanged.
- [x] Record passing and failing checks, outstanding risks, and evidence for a separate rollout decision. Run the deployed-configuration gate check and confirm owner finalization and revision remain closed; this ticket never opens that gate.
- [x] Use a dedicated implementation branch, run acceptance checks, commit only this ticket, push, and open a draft PR.

## Comments

- 2026-09-28: Assessment in draft PR #78. Local delivery, recovery, rotation, production-gate, and synthetic migration-preservation checks passed. The pre-delivery application rollback check failed because that older commit does not pass Next.js TypeScript validation; the readiness command exits nonzero and the deployed gate stays closed. Restored-copy migration and successful older-binary rollback remain required for a separate rollout decision. Repository-wide lint also has an unchanged settings-page error. Human review is needed; this ticket is not marked resolved while the rollback check fails.
- 2026-09-28: Review fixes on the same dedicated branch and draft PR #78. The archived pre-delivery application now receives a documented type-only Next.js compatibility patch and an isolated Prisma client generated from its own schema. It built and ran against the migrated disposable database; owner actions returned 404 and committed event and attempt evidence remained intact. All four `npm run test:billing-webhook-readiness` checks passed, as did `npx tsc --noEmit`. Repository-wide lint still fails only on the unchanged settings-page `react/no-unescaped-entities` error. A recent restored-copy migration and live receiver compatibility remain rollout checks; the deployed finalization and revision gate stays closed.
