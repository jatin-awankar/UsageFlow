# Annotated Ledger — public entry

Ticket [02 — Entry](../.scratch/public-showcase/issues/02-entry.md) only. A separate Next/React static export with Landing (`/`) and Demo (`/demo/`). The production application and original throwaway prototype are unchanged.

## Install, build, inspect

From the repository root:

```sh
npm ci --prefix showcase --ignore-scripts
npm run showcase:typecheck
npm run showcase:build
npm run showcase:serve
```

Open http://127.0.0.1:3211. Serve **showcase/out**, never the production app. Python 3 is only the local static test server; hosting needs only the exported files. The standalone package has no Prisma, database, authentication, queue, analytics, or service SDK dependency. No environment file, API keys, database, worker, receiver, or root postinstall is needed. Root scripts are convenience wrappers around this package.

```sh
cd showcase
npx playwright install chromium firefox webkit
npm test
# An individual available engine:
npm test -- --project chromium
```

Playwright starts a static HTTP server itself; stop any manually started server first. Test artifacts are in `../test-results/showcase`. Tests use UI roles/labels and independent literal money values. Query parameters cannot choose fixtures, clocks, or faults; none are implemented in this entry release.

## Scope and state

A layout-level provider holds only editable quantity in memory for the current tab. Next links and browser history within the live app retain it; reload and new tabs start at 1,250. Four chapter controls describe prerequisites; all acceptance, processing/rating, finalization and delivery buttons are disabled. The two baseline source events are explicit synthetic fixtures. The landing's worked example is illustrative, never a visitor result. Reset confirmation restores quantity and chapter; Escape/cancel preserves input and restores focus.

The evidence page is visibly unavailable pending ticket 03. Quantity validation/acceptance, lifecycle calculations, monthly reconciliation, finalization, and delivery belong to later tickets. No deployment, backend migration, or gate changes are part of this package.

## Prototype assessment and design

Reviewed prototype commit `e2ef35e`, the approved direction decision, and planning commit `5c2c85c` (available in base `b0e3529`). Reused reviewed headline/copy, warm paper/ink/terracotta colors, Fraunces hierarchy, ruled calculation, adjacent annotation, semantic quantity control, and the Radix reset pattern. Rebuilt the two routes, state ownership, explicit baseline sources, scoped styles and chapter focus/navigation. Did not copy the combined comparison component, arithmetic, accepted/rated flags, preview output, Signal Desk theme, or comparison controls.

Chapters occupy a horizontal editorial index so the active chapter and its evidence form only two content columns. At small widths the index wraps and evidence follows its associated chapter; nothing is fixed over content. Technical labels are 12–14px rather than prototype fine print. Motion is unnecessary for entry; reduced-motion explicitly preserves all controls/content.

Only Fraunces 500 and Inter 400/600 are self-hosted, unmodified from the prototype's licensed assets: three files, approximately 700 KiB rather than the eleven-file ~2.3 MB comparison bundle. No font network request. Font sources and OFL notices are retained in `public/fonts`; provenance is in the [prototype notes](../.scratch/public-showcase/prototype/README.md#font-provenance-and-notices). Tailwind utilities support layout/spacing; Radix supplies the needed dialog primitive; only ArrowRight, ArrowUpRight, Fingerprint, LockKeyhole and RotateCcw are used from Lucide. No component kit or animation framework.

See [review evidence](review/README.md) for browser captures, checks and limitations.
