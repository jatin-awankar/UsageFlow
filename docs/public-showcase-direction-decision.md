# Approved showcase direction and reuse assessment

Recorded 2026-10-04 on `codex/showcase-specification`.

## Approved decision

The user selected **Annotated Ledger** as the primary direction. Preserve its editorial hierarchy, warm paper/ink character, chapter progression, ruled calculation evidence, and adjacent annotations. The three-page scope in the [brief](../.scratch/public-showcase/spec.md) remains unchanged.

The primary prototype reference is commit `e2ef35e` on `codex/prototype-showcase-directions`; the [prototype notes](../.scratch/public-showcase/prototype/README.md) retain the original comparison. Signal Desk is a reference for improving traceability, not approval for a second product theme or a console redesign.

## Inspector integration to assess

Propose a compact evidence summary within Annotated Ledger's existing margin: selected event ID, acceptance/processing/rating labels, applicable PriceVersion, and current contribution. Expand additional evidence on demand within the same column. Do not add a third content column, duplicate the monthly total in multiple competing panels, or displace the active chapter's primary action.

On mobile, place the evidence immediately after its relevant explanation or calculation, with a clearly named inline disclosure for longer details. Avoid a persistent overlay, fixed sidebar, tiny split panes, or an inspector that obscures the next action. The event ID and contribution must remain findable without opening raw JSON.

Retain this integration only if a reviewer can trace event → price → BillingRecord → webhook more easily without worsening the chapter sequence, reading order, or mobile scrolling. The exact inspector composition remains an adjustment to review, not an approved new layout.

## Remaining visual adjustments

- Increase/validate small technical labels and quiet text for readability, contrast, zoom, and touch targets. The prototype's compact fine print is not a production typography specification.
- Complete the monthly reconciliation, explicit UTC clock transition, finalization confirmation/version evidence, delivery outcome, and evidence-page layouts within the existing editorial grammar.
- Design loading, not-yet-created, recoverable-error, validation, reset, and completion states. No new failure/recovery story or administrative feature is added.
- Keep core quantities, timestamps, state labels, and source references visible in the appropriate chapter; progressively disclose payload details rather than dominating the story with JSON.
- Retain Fraunces/Inter as the direction's font candidates, select only needed files/weights, preserve OFL notices, and optimize the prototype's uncompressed multi-direction font bundle before release.
- Validate content-preserving reduced motion and keyboard focus through chapter/inspector transitions. Remove comparison controls from the eventual showcase.
- Finalize contrast-tested accent shades, spacing, and small-screen wrapping. These are bounded refinements of the chosen direction, not another reference-research round.

## Prototype code assessment

Reviewed the prototype source and styles at `e2ef35e`, not merely its screenshots. It is useful as a design reference, **not ready to promote wholesale**.

**Potentially reusable after extraction and checks:** copy, domain-safe labels, semantic quantity control, exact INR worked example, Radix reset-dialog pattern, Lucide icon subset, layout ideas, and font notices. Reassess focus and announcements in the final page structure rather than assuming prototype checks carry over.

**Rebuild or substantially revise:**

- One large component currently mixes both designs, route switching, state, calculations, and render helpers. Separate the chosen presentation from the browser-local simulation, without introducing a generic application framework.
- Prototype arithmetic duplicates the INR-only calculation and appends a zero to create three-place storage-looking strings. Prefer reuse of the existing browser-safe pure money contract where practical and exact persisted-amount semantics. Do not import Prisma/database modules into a client bundle.
- Baseline events are aggregated constants rather than a source-event collection. Build a fixed, explicit fixture with inspectable source references so line totals, reconciliation, final versions, and webhook evidence derive from the same data.
- The fixed event ID, retry counter, and booleans demonstrate the idea; they are not a complete finalization/version/delivery lifecycle. The full simulation needs guarded transitions and one immutable result for repeated acceptance/finalization actions.
- The prototype provides no full evidence page, real application error recovery, finalization, webhook transition, robust page-navigation semantics, or validation of independent tabs and refresh behavior.
- Compressed, broad CSS and the two-direction selector are throwaway scaffolding. Rebuild scoped styles with reviewed tokens and remove preview-only controls. Preserve the original reference on its branch.

Backend quantity discrepancy remains separately recorded in [contract verification](public-showcase-contract-verification.md). No backend fix, database change, or deployed gate change is part of this decision.

## Next checkpoint

Review the [proposed browser acceptance approach](public-showcase-test-proposal.md) before publishing the complete specification. No implementation tickets have been started, and no prototype code has been promoted to production.
