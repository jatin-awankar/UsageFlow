# Billing webhook delivery readiness evidence

This is a local, synthetic assessment for `invoice.finalized` and `invoice.revised` BillingRecord comparison calculations. It does not authorize pilot enablement. The deployed owner finalization and revision gate remains closed.

## Repeat the assessment

From the repository root, with Node dependencies installed and local Docker available:

```sh
npm run test:billing-webhook-readiness
npx tsc --noEmit
npm run lint
```

The readiness command creates disposable PostgreSQL 17 and Redis 7 containers on loopback ports and runs a loopback HTTP receiver. Its production-config check builds and starts Next.js against a separate disposable database. Every harness removes its containers afterward. It does not read or write the live database. Do not supply a production `DATABASE_URL` or secrets to these commands; the harness replaces the database connection with a synthetic container connection.

## Acceptance evidence

| Requirement | Executable evidence |
| --- | --- |
| Owner finalization and revision through the nonproduction path, one immutable event per version, selected targets or no target, signed exact body, tenant isolation, replay and visible attempts | `scripts/test-billing-webhook-recovery.sh` runs `tests/customer-month-draft.spec.ts` through the real app and worker against disposable PostgreSQL, Redis, and a loopback receiver. |
| Queue loss, concurrent claims, crash before target selection, crash before HTTP send, and crash after receiver acceptance but before recording success | `scripts/billing-webhook-recovery.integration.ts` kills and restarts real workers, removes Redis jobs, and checks committed event IDs, billing facts, work, and attempt rows. The pre-send crash holds an endpoint lock, kills the claimed worker, expires the lease, then recovers from PostgreSQL. |
| Five-attempt bound, retry delays, HTTP failures, timeout, connection close, terminal failure, mixed endpoints, and owner replay | The same worker integration uses controlled due times and a loopback receiver; `scripts/billing-delivery-view.test.tsx` checks visible outcomes. |
| New secret, immediate previous secret during 24 hours, expiry and redaction | `scripts/test-webhook-secret-rotation.sh` runs the rotation integration against disposable PostgreSQL and a loopback receiver. |
| Legacy Invoice and legacy `invoice.created` behavior | The owner-path test checks that the legacy Invoice amount remains unchanged. The worker integration sends an `invoice.created` event to a loopback receiver and checks its original bare-body HMAC with no timestamp header. |
| Additive migration and application rollback | `scripts/test-billing-webhook-upgrade-rehearsal.sh` seeds a synthetic finalized version, failed delivery, endpoint, and legacy event before the webhook migrations, then checks counts, recovery indexes, selected target, attempt, and legacy event after migration. It attempts to build and run the pre-delivery application at commit `c9fab7ed59b7880874fb3c404334925e673d7163` against the migrated database, with webhook workers stopped. `BILLING_WEBHOOK_ROLLBACK_REF` can select another reviewed rollback candidate. |
| Deployed owner action gate | `scripts/test-billing-webhook-deployed-gate.sh` builds and starts the production configuration against disposable PostgreSQL. It deliberately sets both nonproduction test flags and checks that finalization and revision return 404 with no version, adjustment, or event inserted. |

The upgrade rehearsal starts from synthetic data rather than a recent restored copy. It cannot establish live migration safety, receiver compatibility, infrastructure recovery time, or data-loss bounds. During rollback, stop webhook workers and scanner, leave additive schema and all event, target, work, attempt, and replay rows intact, and resume unfinished delivery only with a reviewed recovery worker. Do not infer HTTP success from an uncertain attempt.

## Local run and decision

The readiness command reports each check as PASS or FAIL and exits nonzero if any check fails. Record its output, commit, date, and environment in the rollout review. A passing local run proves only the synthetic paths above. Keep the deployed gate closed until a separate decision reviews restored-copy migration and rollback evidence, receiver protocol updates, and pilot operations.

On 2026-09-28, the billing delivery and owner actions, secret rotation, and production-config gate checks passed on the local development host. The synthetic webhook migrations preserved one finalized version, two events (including a legacy event), one selected target, and one failed attempt. **The pre-delivery application rollback check failed:** the old commit's production build fails TypeScript validation in `app/app/[orgId]/analytics/page.tsx` because its route `params` type includes a non-Promise value. The older binary was therefore not started against the migrated database. The readiness command exits nonzero and the gate remains closed. The separate repository regression scripts for inventory, Customer ownership and ingestion, ledger acceptance and recovery, legacy billing treatment, ledger export, and legacy exclusion passed. `npx tsc --noEmit` passed on the current branch. `npm run lint` failed at an unchanged `react/no-unescaped-entities` error in `app/app/[orgId]/settings/page.tsx:70`; lint on the modified TypeScript integration test passed.

**Decision:** local webhook behavior has repeatable evidence, but the pre-delivery binary is not a viable rollback target without a separately reviewed compatibility fix. A recent restored-copy upgrade and a successful older-binary rollback rehearsal remain unverified. No live receiver compatibility or provider outage behavior was tested. The deployed finalization and revision gate stays closed.
