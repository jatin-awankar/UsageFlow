# Ticket 09 — static release verification

**Publication: BLOCKED. No deployment performed or authorized.** Local functional verification is complete in Chromium and WebKit. Firefox could not launch. The owner-supplied email is wired and verified at the UI boundary. The existing Vercel Hobby project serves the main application, not this static export; the proposed static configuration and Hobby eligibility remain publication prerequisites. Human usability and full accessibility assessment remain pending. This is not a production-readiness or onboarding approval.

## Candidate and scope

Verified on 4 October 2026, macOS 27.0.1 (26A434), Node 24.20.0, Playwright 1.63.0. Clean `main` was fetched and fast-forward checked before creating `codex/showcase-09-release-verification` at `4e46dc2cda1469cac56776255c63564db5c018f4`. Dependencies were already merged: [ticket 03 / PR #116](https://github.com/jatin-awankar/UsageFlow/pull/116), merge `4e46dc2`, and [ticket 08 / PR #115](https://github.com/jatin-awankar/UsageFlow/pull/115), merge `f6adc01`.

Changes are limited to the isolated showcase, its verification assets, ticket 09 and a root `vercel.json` rule disabling automatic deployments of this release branch only. The production app, backend contracts, schema, migrations, legacy workflows, prototype branch, production-readiness records and deployed pilot gates are unchanged. No database, credentials, worker or receiver is used. Relevant acceptance is the approved [three-page spec](../../../.scratch/public-showcase/spec.md) at the rendered browser boundary.

## Passed local checks

- Normal export: **146 passed, 48 isolated-only skips**, no unexpected failures or retries. Chromium **73 passed / 24 skips**, WebKit **73 passed / 24 skips**. [Per-test results](normal-results.json).
- Isolated export: **168 passed, 26 normal-only skips**, no unexpected failures or retries. Chromium **84 passed / 13 skips**, WebKit **84 passed / 13 skips**. [Per-test results](isolated-results.json). Skips are mode-specific cases run in the other build, not silently counted as passes.
- Actual browser versions: Chromium **153.0.8010.12**, WebKit **26.6**. Both ran the entire suite, exceeding the requested WebKit smoke scope. The separate Firefox result below is not included in these totals.
- Typecheck, targeted ESLint and both static builds pass. The normal build is restored last. [Export manifest](export-manifest.json) records every final generated asset's SHA-256, size and required files; rebuilds can change generated hashes.
- Complete Landing → acceptance → rating → price inspector → monthly review → explicit time advance → owner approval → delivery → completion journey, with evidence excursions and Back/Forward preserving the same run. New release tests traverse controls with keyboard events without programmatically focusing targets. Existing focused suites cover validation, rapid acceptance/retry, cancelled reset, dialog containment/Escape/restoration, independent contexts/tabs and fresh reload.
- Independent literal amounts: default contribution `3.130`, monthly/payload `28.130`; edited 1,500 gives `3.750` / `28.750`; one and two calls give `0.000` / `25.000` and `0.010` / `25.010`. Per-event rounding trap stays `25.000`. Occurrence-month membership, price applicability, exact-close blocking and UTC/Asia-Kolkata wall-clock independence are covered by isolated initial fixtures.
- Retry before/after rating and close/finalization retains immutable identity and amounts. Pending/processed-unrated/inconsistent evidence cannot finalize. Reapproval keeps one frozen version/event. Delayed initialization, recoverable initialization/rating/finalization failures, empty future stages and missing delivery target are covered. No target never claims delivery.
- All three direct URLs (`/`, `/demo/`, `/evidence/`) serve without authentication. WOFF2 fonts decode and licence files serve with correct local MIME types. Unknown pages return 404. These are local export checks, not hosted-provider verification.
- Publication builds ignore all supported fixture/clock/fault query parameters. Static artifact scan finds no fixture selectors, test contact, test price or prototype comparison markers. The scan was also run against an isolated build and correctly **rejected** it on `test-init`; setting the verifier's environment to normal cannot disguise an actual test export.
- [Network observations](network.json): all observed journey requests in six normal runs (three widths × two engines) were local GET/HEAD requests to files present in the export. No real backend write, webhook receiver request, paid API, external font, WebSocket, response error or page exception occurred. Cancelled Next navigation probes are retained separately in the evidence. Source inspection found no showcase fetch/XHR/beacon, browser storage, cross-tab channel, Prisma import or production-secret environment use. The synthetic receiver URL is displayed evidence only.
- [Source-link audit](source-links.json): public implementation repository exists, all 12 distinct pinned evidence files exist at `f6adc01`, and accessible link names/hrefs are asserted by the browser suite. Source pages describe their dated verification limitations; exploratory pilot wording remains explicit.

Commands (from the repository root):

```sh
npm run showcase:typecheck
SHOWCASE_TEST_BUILD=1 npm run showcase:build
SHOWCASE_TEST_BUILD=1 PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/showcase-isolated-results.json npm run showcase:test -- --project=chromium --project=webkit --workers=2 --reporter=line,json
npm run showcase:build
node showcase/scripts/verify-export.mjs
PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/showcase-normal-results.json npm run showcase:test -- --project=chromium --project=webkit --workers=2 --reporter=line,json
PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/showcase-firefox-results.json npm run showcase:test -- release.spec.ts --project=firefox --workers=1 --reporter=line,json
```

Checked-in result files retain per-test status, skip annotations, duration and errors from the Playwright JSON reports. Raw runner logs/reports were written under `/tmp/showcase-*`; ordinary traces and captures use ignored `test-results/showcase/` and are overwritten by later runs. The selected final captures, network records, axe outputs and compact result records here are durable evidence. Backend/database suites were not run: no backend code changed and those environments are outside this static acceptance boundary.

## Failed or unavailable checks

**Firefox smoke unavailable:** configured Firefox 155.0 / Playwright revision 1543 exits before opening a page with `Could not find profile folder.` Four release smoke tests failed at browser launch, not at a page assertion. Repeating the launch with `TMPDIR=/private/tmp` produced the same error. [Actual launch errors](firefox-results.json). Firefox happy path, keyboard, responsive behavior and font decoding remain **unmeasured**; rerun on a functioning Firefox environment before claiming three-engine coverage.

**Dependency audit is not clean:** `npm audit --prefix showcase --json` reported one critical and two high affected dependency entries (Next, PostCSS, Sharp); [audit report](dependency-audit.json). This ticket did not broaden into a framework upgrade. The tested distribution is static `out/` files, with no Next server, image optimizer, middleware or Server Actions running; build tooling still needs its own dependency remediation review. This observation is not a general security clearance or a claim that the production application is safe. Do not publish the server/build environment as the showcase.

## Accessibility and visual assessment

Target: WCAG 2.2 AA. **No full conformance claim.** Automated checks, agent visual inspection and unperformed human/assistive-technology work are distinguished below.

**Automated:** axe-core 4.11.0 through `@axe-core/playwright`, tagged WCAG 2 A/AA, 2.1 A/AA and 2.2 AA; 36 scans of landing, pricing, evidence, approval, finalized and delivered states at 360/768/1440px in Chromium/WebKit, **zero violations**. [Full violations and incomplete results](accessibility.json). Incomplete findings are retained, not treated as passes: Radix hidden-background/focus guards, dynamic `aria-controls` references, and dialog contrast require human/assistive-technology assessment. A reviewed generic-div accessible-label issue was fixed by exposing Successful simulated attempt as a named region. The UI assertion failed before this fix and passed after it. Final visual inspection also caught and corrected stale test-only contact copy; the public email-app description is now checked in the UI and the obsolete phrase is rejected by the export scan.

Automated keyboard checks cover visible outlines, ordered traversal, quantity errors, chapter heading focus, disclosures, approval/reset containment and Escape restoration, status announcements, delivery details and the supplied contact link. The end-to-end test uses Option-Tab for links in macOS WebKit and ordinary Tab inside modal button groups. Option-Tab alone did not wrap from the last modal control: Radix's loop excludes modified Tab. Standard Tab and Shift-Tab work; this platform distinction is a known limitation, not a universal keyboard claim.

**Agent visual inspection, 4 October:** compared final desktop/mobile captures against the existing approved capture set. The Fraunces hierarchy, paper/ink surfaces, ruled calculations and two-column desktop composition remain intact after font conversion. At 360px the inspector follows its calculation inline, identities and amounts wrap legibly, and no fixed inspector covers actions. Landing, calculation, finalization, delivery and evidence captures show no clipped page content. The evidence page is long (about 8,300 CSS pixels at 360px); whether that length impedes comprehension is unmeasured. JSON uses a labeled contained horizontal scroller rather than forcing page overflow.

**Contrast spot-check:** computed from the six CSS palette pairs, ink/muted/accent on paper and soft surfaces: ink **12.49:1 / 11.51:1**, muted **5.17:1 / 4.76:1**, accent **6.05:1 / 5.57:1**. These exceed 4.5:1 for those text pairs only. This is not an exhaustive assessment of outlines, borders, disabled controls or every composited surface.

**Responsive/reflow and motion:** rendered checks at 360, 768 and 1440 CSS pixels pass without page-level overflow, plus existing 320px reflow checks. Complete release journeys pass with `prefers-reduced-motion: reduce`; no animation carries required information. A 320px viewport is supporting reflow evidence, **not native browser 200%/400% zoom testing**.

**Pending manual work:** no native screen-reader session, manual end-to-end keyboard session with assistive technology, native browser zoom, OS reduced-motion session, exhaustive contrast/focus-obscuration audit or physical touch-device assessment was performed. CSS primary/secondary actions have at least 44px height, but links/disclosures need a full WCAG 2.5.8 target-size/spacing review. Automated status-role checks do not prove announcements are understandable. Axe's incomplete findings and the modified-Tab modal limitation remain documented for that assessment.

Stable normal-build captures (Chromium; snapshots are review aids, not pixel-diff assertions):

- Landing: [360px](landing-360.png), [1440px](landing-1440.png).
- Calculation and inspector: [360px](pricing-360.png), [1440px](pricing-1440.png).
- Approval: [360px](approval-360.png), [1440px](approval-1440.png). Full-page screenshots include a viewport-positioned overlay; inspect the dialog at its captured viewport position.
- Frozen finalization: [360px](finalized-360.png), [1440px](finalized-1440.png).
- Delivery and completion: [360px](delivery-360.png), [1440px](delivery-1440.png).
- Evidence: [360px](evidence-360.png), [1440px](evidence-1440.png).

## Fonts and notices

Three complete-glyph WOFF2 fonts: Fraunces 500 and Inter 400/600, **251,028 bytes** total versus **722,464 bytes**, a **65.25% reduction**. Only format conversion was applied with FontTools 4.60.1/Brotli 1.2.0; no glyph subsetting or visual redesign. Provenance, source sizes and conversion method: [font README](../../public/fonts/README.txt). Retained [Fraunces OFL](../../public/fonts/Fraunces-OFL.txt) and [Inter OFL](../../public/fonts/Inter-OFL.txt) ship in the export. [Runtime third-party notices](../../public/THIRD-PARTY-NOTICES.txt), including React/Next, Radix, Lucide/Feather and helper dependencies, are linked in the footer. Extra installed-runtime notices are retained conservatively even where code is build-only or tree-shaken. No font service request is needed.

## Contact and precise publication blockers

**Contact verified at the UI boundary:** the owner supplied `jatinawankar02@gmail.com` in this task for public pilot enquiries. Both the evidence page and delivered completion use exactly `mailto:jatinawankar02@gmail.com`, with exploratory/readiness-review wording. Browser checks validate the rendered link and keyboard reachability without activating a mail client. No test email was sent; inbox delivery/monitoring was not independently measured. The invalid test-only contact remains excluded from the normal export.

**Existing host inspected read-only:** the owner identified [usageflow.vercel.app](https://usageflow.vercel.app/) and the free plan; the authenticated Vercel dashboard independently showed Hobby, Next.js preset, repository-root directory, no build/output/install overrides, Node 24.x, Basic build machine and disabled paid on-demand concurrent builds. Production was on main at `4e46dc2`. No dashboard setting was changed and environment-variable contents were not opened. [Recorded observations and HTTP results](existing-host.json). Root returns 200 with the existing application; `/demo/` and `/evidence/` redirect to slashless paths then return 404; the WOFF2 showcase asset returns 404. This host currently does **not** serve the three-page export.

**Publication remains BLOCKED:** the existing project has not been approved/reconfigured as the isolated static showcase, and Vercel Hobby eligibility is not established for this pilot-facing product presentation. Vercel limits Hobby to personal non-commercial use and includes advertising a product/service for sale within commercial usage. Given the exploratory pilot CTA, do not assume eligibility; resolve it with the provider or select an eligible zero-cost arrangement before publication. No paid-plan upgrade is authorized. [Official fair-use guidance, checked 2026-10-04](https://vercel.com/docs/limits/fair-use-guidelines).

### Proposed Vercel static configuration — prepared, not applied

[showcase/vercel.json](../../vercel.json) is a reviewable configuration for a separately approved showcase project rooted at `showcase`: framework Other (`null`), `npm ci --ignore-scripts`, build `npm run build && npm run verify:export`, output `out`, trailing slash enabled, and **all Git auto-deployments disabled**. The build needs the repository's `lib/money-contract.ts` outside this root, so Include files outside the root directory must be enabled. It needs no environment variables; in particular, no test-build flag or production credentials. Used configuration properties validate against Vercel's downloaded JSON schema. Its full schema has a draft-version mismatch in unrelated experimental-function fields, so validation was restricted to the properties actually used; provider-side build execution remains unmeasured. [Static configuration reference](https://vercel.com/docs/project-configuration/vercel-json), [build/output behavior](https://vercel.com/docs/builds/configure-a-build).

Serve only `showcase/out/` at an origin root: directory-index routing for `/demo/` and `/evidence/`; preserve `/_next/static/*`, exported route `.txt` navigation files, `/fonts/*` and notices; return 404 for unknown paths. Root-relative URLs do not support a `/UsageFlow/` subpath without a separately tested base-path change. Local direct-page and MIME/asset checks pass; intended-host direct-page/asset checks for this candidate are **pending** because no deployment is authorized. Runtime services required: **none**; Python is only the local test server. No database, server function, worker, receiver, analytics SDK or paid API is required.

Official Hobby resources checked on 2026-10-04: 100 GB fast data transfer, 10 GB fast origin transfer and 1,000,000 CDN requests included; usage exhaustion generally pauses the resource until its allowance recovers rather than buying additional usage. Hobby has no configurable Spend Management feature. Preserve Hobby, avoid paid upgrades/add-ons and keep on-demand builds disabled; account-wide quotas are shared with the existing application. [Hobby plan](https://vercel.com/docs/plans/hobby).

Documented general limits include 100 deployments/day, one concurrent Hobby build, 45-minute maximum build and 100 MB CLI source-upload limit (not a claim about total hosted-storage allowance). No numeric aggregate static-storage entitlement was established from these pages. Final export size/file hashes are in the manifest; it is well below the upload limit, but that does not verify account usage or policy eligibility. [Vercel limits](https://vercel.com/docs/limits).

**No-deployment enforcement for this PR:** earlier PR checks prove the repository's Vercel Git integration auto-deploys branches. Root [vercel.json](../../../vercel.json) disables only `codex/showcase-09-release-verification`; unspecified branches retain existing behavior. The nested showcase configuration disables all Git deployment. This safeguard is necessary to push the requested draft PR without intentionally triggering a preview. [Documented branch controls](https://vercel.com/docs/project-configuration/git-configuration). Do not merge, manually deploy or promote this candidate under this ticket. A later approval must address host suitability, Firefox, assessment limitations and the unmet usability target.

## Human usability — pending

**Zero participants; no measured completions or timings.** Target remains at least four of five actual first-time participants finishing unassisted within five minutes and explaining the event's contribution. For each future participant record completion, elapsed time, assistance, comprehension and obstacles. Neither Playwright timing nor this agent's review is participant evidence. The target is not achieved; no release decision waiving or accepting an unmet target has been made.

## Review and handoff

Ticket status remains ready-for-human, not resolved: static-host publication prerequisites and Firefox coverage remain incomplete. [Independent Standards and Spec review](CODE-REVIEW.md): zero remaining findings on either axis, including the final public-contact copy correction. [Draft PR #117](https://github.com/jatin-awankar/UsageFlow/pull/117), implementation commit `b897f41`, is open for human review. Human PR review and any publication approval are separate. No merge or deployment occurred.
