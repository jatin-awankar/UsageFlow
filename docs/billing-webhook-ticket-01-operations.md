# Billing webhook target delivery: ticket 01

This ticket selects active, subscribed Organization endpoints in the finalization or revision transaction. A billing event with no selected endpoint has `NO_TARGET` status. A selected endpoint disabled before the worker claims its send is recorded as `SKIPPED`. Deactivation waits for an in-flight send to finish, so a completed send can still be recorded as successful. The deployed owner finalization gate stays closed.

## Migration

Apply `20260928060000_billing_webhook_target_outcomes` to a disposable PostgreSQL database first. It adds `NO_TARGET` and `SKIPPED` enum values, tightens the billing event immutability trigger, and prevents deletion or URL/Organization changes for endpoints selected by a billing event. Active state and secret can still change. Run the owner acceptance harness with disposable PostgreSQL, local Redis, the real worker, and a loopback receiver before any wider deployment. No customer mapping or historical backfill is performed.

## Application rollback

Stop the application and worker version that dispatches billing events, then deploy the previous application and worker. Keep the additive database migration in place: PostgreSQL enum values are not safely removed while rows may use them. Preserve committed `WebhookEvent` rows, their selected `targetEndpointIds`, `NO_TARGET` statuses, and `WebhookDelivery` outcomes. Do not delete or reselect them. Resume their delivery through a later reviewed recovery release. Legacy webhook delivery remains on its existing path. Do not open the production owner finalization gate during rollback.
