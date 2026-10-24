# Ticket 01 — showcase dependency and release baseline

Verified 24 October 2026. **Local baseline refreshed; not deployed. Firefox remains unavailable in this environment.** This record supplements, rather than overwrites, the [4 October release assessment](../release/README.md). Hosting, human usability, and full manual accessibility assessment remain separate work.

## Scope and dependency remediation

Base `84ead78` includes the contact fallback from open draft PR #118. Branch `codex/recruiter-01-showcase-baseline` targets that predecessor branch so this PR excludes the contact changes. Merge the predecessor before retargeting this PR to main.

The initial standalone npm audit reported three affected package entries: Next.js critical, PostCSS high, and Sharp high. Updated only the showcase's pinned Next.js version from 16.1.1 to 16.4.3 and regenerated its lockfile. This resolves Next's PostCSS to 8.5.23, Sharp to 0.35.5, and SWC helpers to 0.5.23. React and React DOM remain 19.2.3. Updated the shipped Next/PostCSS/SWC notices from their installed licence files. No forced audit fix, dependency override, or major-version jump was used.

`npm ci --prefix showcase --ignore-scripts` passes. The fresh complete standalone audit reports **zero known vulnerabilities**. [Before/after registry audit](dependency-audit.json). This is dated advisory evidence, not a general security guarantee. The repository-root app and its dependency advisories were not changed or cleared by this work. Most Next server vulnerabilities do not describe an executing server in this static export; the build dependency was remediated nonetheless.

Reference: [Next.js 16.4.3 release](https://github.com/vercel/next.js/releases/tag/v16.4.3). Exact tested lockfile hash is retained in [verification.json](verification.json).

## Validation results

- Node 24.20.0; npm 11.19.0; Playwright 1.63.0.
- Clean install, normal and isolated webpack builds, TypeScript, targeted ESLint, and `git diff --check` pass.
- **Normal export: 148 passed / 50 skipped**, Chromium 74 and WebKit 74 passing. No unexpected failures, flaky classifications, or retries.
- **Isolated export: 172 passed / 26 skipped**, Chromium 86 and WebKit 86 passing. No unexpected failures, flaky classifications, or retries.
- Skips are explicitly mode-specific; they are not counted as passes. The additional keyboard scenario uses the isolated delayed-initialization fixture and is skipped in a normal export.
- Actual tested browsers: Chromium 153.0.8010.12 and WebKit 26.6. These are Playwright engines, not a claim of native Safari testing.
- Release journeys verify exact amounts, acceptance/retry/reset, monthly reconciliation and close boundaries, approval, delivery, contact fallback, navigation, keyboard operation, and direct pages/assets. The tests also verify no external requests, non-GET/HEAD requests, WebSockets, page exceptions, or unexpected response failures in the six normal release journeys.
- Normal release journeys run at 360/768/1440px in both engines with reduced motion. All **36 axe scans report zero violations**; incomplete findings are retained in the evidence. This does not establish full accessibility conformance. Agent inspection of final Chromium landing captures at 360px and 1440px found the existing layout intact; no new redesign or human usability study was performed.
- The publication verifier rejects the actual isolated export on `test-init`, even without the test-build environment flag. The normal export was restored last and passes verification. [Final SHA-256 asset manifest](export-manifest.json): required pages/notices, three WOFF2 fonts totaling 251,028 bytes, and fixture/prototype exclusions.
- A heuristic scan of all 53 exported files found no environment files or selected secret-shaped strings. [Scan scope and limitations](artifact-scan.json). No production environment file contents were read. This scan is not proof that every possible secret format is absent.

Compact per-test results, failures before remediation, browser/network observations, and accessibility summaries: [verification.json](verification.json). Raw local runner logs and full reports were written under `/tmp/usageflow-showcase-*`; selected durable evidence is in this directory.

## Keyboard test diagnosis

The first updated normal suite had 147 passes, 48 mode-specific skips, and one Chromium focus assertion failure. The keyboard test sent Tab immediately after navigation and assumed the initialized controls already existed. Five isolated repetitions happened to pass, demonstrating that simply rerunning was insufficient evidence of a fix.

Using the existing 2.5-second initialization fixture reproduced the same focus failure deterministically before the change. The test now waits for the visible quantity control before starting keyboard traversal. It does not programmatically focus that control, replace keyboard actions with clicks, or weaken the existing focus/containment assertions. The same complete keyboard scenario now covers both normal and delayed initialization. Three repetitions per mode and engine passed all 12 cases, followed by both passing full suites.

Typechecking immediately after the framework upgrade initially encountered stale generated `.next/types` from Next 16.1.1. Removing only the generated showcase `.next` directory and rebuilding regenerated compatible types; no application types or checks were weakened.

## Firefox blocker

Firefox 155.0 / Playwright revision 1543 cannot launch on this macOS host. In the sandbox it aborts; outside it exits with `Could not find profile folder.` This occurs before any showcase URL loads.

The same minimal data-URL launch probe was tested with the existing browser outside the sandbox, an explicitly created real-path profile in `/private/tmp`, and a fresh browser download in an isolated temporary cache. The profile error persists. This rules out a simple stale cached download or the tested profile path as sufficient fixes; the underlying Firefox/macOS cause is not established. No browser security settings or user profiles were modified.

A formal direct-pages smoke test also failed at launch; the error is retained in `verification.json`. Firefox behavior is **unmeasured**, not passed. Repeat on a working Firefox host before claiming three-engine coverage. Ticket 01 explicitly permits recording this environmental blocker; it remains a release follow-up for ticket 02.

## Reproduce

From the repository root, with Playwright's Chromium and WebKit installed:

```sh
npm ci --prefix showcase --ignore-scripts
npm audit --prefix showcase
SHOWCASE_TEST_BUILD=1 npm run showcase:build
SHOWCASE_TEST_BUILD=1 npm run showcase:test -- --project=chromium --project=webkit --workers=2
# Expected to fail on forbidden test markers:
node showcase/scripts/verify-export.mjs
# Always restore the normal export:
npm run showcase:build
npm run showcase:typecheck
node showcase/scripts/verify-export.mjs
npm run showcase:test -- --project=chromium --project=webkit --workers=2
./node_modules/.bin/eslint showcase/app showcase/tests showcase/next.config.ts showcase/playwright.config.ts showcase/scripts/verify-export.mjs
# Requires a functioning Firefox installation:
npm run showcase:test -- --project=firefox --workers=1 --grep 'static direct pages'
```

The lint command uses the existing root development tools; the showcase build and browser tests use its standalone dependencies. After changing framework versions, clear only generated `showcase/.next` before building if stale type errors occur.

## Review and release boundary

Local diff review checked the package/lockfile agreement, installed licence updates, unchanged keyboard assertions, test-only fixture boundary, evidence counts, and branch deployment guard. No blocking code findings remain in that review; independent human PR review is pending. Backend, database, load, restore, and migration suites were not run because those paths are unchanged.

Root `vercel.json` disables automatic deployment only for this new branch, preserving existing rules. The showcase configuration continues to disable all Git deployments. No merge, hosting change, production migration, pilot-gate change, or paid resource is part of this ticket.
