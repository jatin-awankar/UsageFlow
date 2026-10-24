# Ticket 02 — first public static deployment

Published and verified 24 October 2026: **[usageflow-showcase.pages.dev](https://usageflow-showcase.pages.dev/)**. This is the synthetic browser-only showcase. No backend, live billing, or real webhook delivery was published.

## Release identity

- Cloudflare Pages production deployment: `fc856e73-5ada-4f0f-a3e7-3ec85c49310e`.
- Immutable deployment URL: [fc856e73.usageflow-showcase.pages.dev](https://fc856e73.usageflow-showcase.pages.dev/).
- Source commit: `e4586b00d4f8c86e96f08cbbb84a78a010a2279f`, branch `codex/recruiter-02-static-publication`, based on `947ed4d` containing merged ticket 01.
- Dashboard shows production source label `main`, but this is a Direct Upload label, **not** evidence that this source commit is merged to the repository's main branch. PR #118 remains the predecessor branch.
- ZIP SHA-256: `3f644df850439b166402225bb37c7101280ba0bb0fca66643aa33567eb203112`; compressed size 648,659 bytes.
- Export: 54 files / 1,630,221 bytes; maximum individual asset 243,104 bytes. Cloudflare consumes `_headers` as configuration and reports 53 deployed assets. The archive has `index.html` at its root and preserves all generated Next navigation files.

[Deployment record](deployment.json), [export manifest](export-manifest.json), and [hosted asset verification](host-assets.json) tie the public artifact to these exact bytes. The local release archive is `/tmp/usageflow-showcase-ticket02.zip`; it is outside the site and may be removed by OS temporary-file cleanup. Rebuilding is documented in the [deployment runbook](../../DEPLOYMENT.md); retained Cloudflare production deployments provide rollback targets for future updates.

## Free hosting and scope

Read-only account inspection showed **Free — $0 — Current plan** before publication. The project has no Git connection, and its deployed environment-variable count is zero. The Functions/Bindings view has no configured function or binding; the uploaded artifact contains neither a Functions directory nor an executable Worker. No upgrade, payment method, purchased domain, storage service, analytics injection, or paid add-on was configured.

The provider's static-only offering and limits are linked in the runbook. Static requests are free; this release does not execute a Worker or consume a database/queue runtime. Future provider policies and account-wide limits still apply. No account ID, credentials, session cookies, or private environment contents are retained in these evidence files.

The existing Vercel application was not replaced. Its automatic deployment is disabled for the ticket branch. The only root application-facing change is the README's public showcase link.

## Checks performed

- Normal build, TypeScript, targeted ESLint, and export verifier passed. The existing shared money contract is compiled from the repository; no duplicate pricing implementation was added.
- Eight local release checks passed before upload: Chromium and WebKit full keyboard journeys at 360/768/1440px, plus direct pages/assets in each engine.
- **Eight hosted release checks passed**, no skips, retries, or unexpected failures. These use the actual HTTPS origin and start no local server. Actual engines: Chromium 153.0.8010.12, WebKit 26.6.
- Hosted checks cover acceptance, identical retry, processing/rating, monthly amount and reconciliation, time advance, approval, frozen payload, simulated delivery, contact disclosure, reset, browser history, direct page loads, and reloads. Fonts decode and notices are served with the expected MIME types.
- The six hosted journeys observed same-origin GET/HEAD requests only, no WebSockets or unexpected page/network errors, and no page-level overflow. **36 hosted axe scans report zero violations**. Incomplete findings remain recorded and do not count as conformance.
- The hosted verifier matched SHA-256 for all 52 ordinary asset URLs plus the exact 404 document at an unknown URL. It confirmed `nosniff`, frame denial, strict-origin referrer policy, and relevant font/text content types. The private `_headers` config is not treated as a publicly served asset.
- Negative checks: the export verifier rejects injected synthetic `.env.release-check` and `_worker.js` files; both probes were removed before final verification and packaging. The host verifier rejects HTTP origins, subpaths, embedded credentials, and an intentionally incorrect homepage digest. A pre-upload heuristic scan found no selected private-key, connection-string, AWS/GitHub/Stripe credential patterns; that is not proof of absence of every possible secret format.
- In-app browser inspection independently confirmed the public landing page and its correct title, navigation, simulation labels, and demo link.

Detailed local/hosted test outcomes, network records, and accessibility summaries: [verification.json](verification.json). This focused release suite supplements ticket 01's full normal and isolated suites; those were not rerun because no app behavior or dependency changed.

## Remaining limitations and rollback

Firefox still cannot launch on this Mac, as diagnosed in [ticket 01](../baseline-2026-10-24/README.md). No new passing Firefox result is claimed. Full manual accessibility assessment, native-device testing, and first-time-user research remain pending for the later presentation work. Static publication is not approval to open pilot gates or claim production billing readiness.

The first deployment has no earlier production rollback target. The runbook describes selecting a prior successful production deployment for subsequent updates and re-verifying it against its own manifest. No live rollback drill was performed. No PR was merged during this ticket.

Local code review checked hosted/local test separation, unchanged same-origin assertions, exact artifact identity, headers, deployment guards, and scope. No blocking local findings remain; independent human PR review remains pending.
