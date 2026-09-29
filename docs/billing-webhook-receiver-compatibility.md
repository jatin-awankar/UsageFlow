# Local billing webhook receiver compatibility kit

Run the sample receiver checks without production data, endpoint URLs, or secrets:

```sh
cd webhook-receiver
npm ci
npm test
```

`npm test` runs the exact ±300-second verifier boundary test and the loopback HTTP compatibility kit. The kit starts the sample Express receiver on an ephemeral `127.0.0.1` port with synthetic secrets. It sends `invoice.finalized` and `invoice.revised`, checks a duplicate stable event ID, rejects body tampering and a wrong secret, accepts modest clock skew in both directions, rejects requests outside the window, accepts the previous secret during rotation, rejects it after expiry, and checks the separate legacy bare-hex path. `npm run test:compatibility` runs only the loopback checks. A PASS requires no database, Redis, Docker, deployed endpoint, or paid service.

This kit verifies the repository's sample receiver. It does **not** verify a prospective pilot team's code or authorize billing traffic. Before subscribing a pilot receiver to either billing event, its operator should run equivalent tests against their own implementation with synthetic events and secrets, record the receiver version and results, and demonstrate durable deduplication by event ID. The sample receiver's in-memory Set is only a demonstration. Coordinate the legacy verifier if the same integration still receives legacy events. Keep the deployed finalization and revision gate closed pending a separate rollout decision.
