# Endpoint signing-secret rotation (ticket 06)

Only a current Organization owner can create or rotate an endpoint secret. Creation and rotation return the new 32-byte random secret in hex once, in the action response. Copy it into the receiver's secret store immediately. Ordinary endpoint reads return only ID, URL, subscriptions, active state, and creation time. Delivery records and audit metadata contain no secret value.

## Receiver verification

Keep the current secret and, during rotation, only its immediately previous value with `previousSecretExpiresAt`. The sample receiver accepts `WEBHOOK_SECRET`, `WEBHOOK_PREVIOUS_SECRET`, and `WEBHOOK_PREVIOUS_SECRET_EXPIRES_AT` (ISO UTC). Verify the raw HTTP body and timestamped `v1=` HMAC before JSON parsing. Try the current secret first. If that fails, try the previous secret only while receiver time is strictly earlier than its expiry. Independently reject requests outside the five-minute timestamp window and deduplicate stable event IDs. At the exact expiry instant, reject the previous secret. A second rotation replaces the old previous secret immediately, so coordinate receiver deployment before rotating again. UsageFlow reads the current secret under the endpoint row lock immediately before each new billing send; retries and replays use the then-current secret.

## Acceptance and deployment

`npm run test:webhook-secret-rotation` migrates disposable PostgreSQL and sends a signed request to a loopback receiver. It checks rotation state, current-secret signing, previous-secret acceptance just before 24 hours and rejection at expiry, foreign endpoint IDs, revoked membership, and audit redaction. Run `npx tsc --noEmit`, `npm run lint`, and the billing recovery acceptance suite. The deployed owner finalization gate remains closed.

## Rollback

Do not roll back the additive secret columns or restore an older database snapshot while any receiver still needs an active overlap. Preserve `secret`, `previousSecret`, and `previousSecretExpiresAt` with their original absolute UTC expiry. If rolling back application code, stop billing workers first, leave the new current secret as the signing key, and deploy a receiver that accepts both keys through the original expiry. Resume workers only after receiver compatibility is confirmed. Remove the previous value only after expiry and receiver migration are complete. Keep the deployed finalization gate closed.
