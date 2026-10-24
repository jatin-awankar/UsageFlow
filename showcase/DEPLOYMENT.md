# Free static publication

Target: Cloudflare Pages Free, Direct Upload, `usageflow-showcase.pages.dev`. Publish only the contents of `showcase/out` at the origin root. The app uses root-relative asset URLs; a repository subpath is unsupported. This is the browser-only synthetic showcase, not the real billing backend.

## Configuration and cost boundary

- Build locally from the full repository: `npm ci --prefix showcase --ignore-scripts`, then `npm run showcase:build`. This retains access to the shared `lib/money-contract.ts` outside the showcase package. No Cloudflare build command or environment variables are needed for Direct Upload.
- Upload only the verified static export, never the repository root, `.next`, or a test build. The top-level `404.html` preserves genuine unknown-page 404s instead of a catch-all single-page-app fallback.
- No Functions, `_worker.js`, Workers bindings, database, queues, custom domain purchase, analytics injection, or paid add-ons. Do not enable a paid Workers plan to serve this export.
- `_headers` sets `nosniff`, frame denial, and strict-origin referrer policy. Keep Next's generated `.txt` navigation files and all `/_next/static/` files intact.
- Direct Upload has no Git-triggered builds. This first release uses deliberate dashboard uploads. Cloudflare does not support converting a Direct Upload project to Git integration; a future switch requires a new project. Wrangler uploads remain an option without adding Git integration.
- The existing Vercel app and its hosting settings are independent. The ticket branch is excluded from that repository's automatic Vercel deployments.

Official limits checked 24 October 2026: static requests are free and unlimited; Pages Free allows 20,000 files, with a 25 MiB maximum per asset. Dashboard drag-and-drop uploads have a lower 1,000-file limit. The 500 monthly build allowance applies to provider builds; this upload does not invoke them. Stay within the Free plan and reassess limits before changing architecture. Free hosting is subject to provider policies and is not an uptime guarantee.

Sources: [static pricing](https://developers.cloudflare.com/pages/functions/pricing/), [Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/), [routing](https://developers.cloudflare.com/pages/configuration/serving-pages/), [headers](https://developers.cloudflare.com/pages/configuration/headers/).

## Prepare an update

Use a clean checkout of the intended committed revision. Run from the repository root, with Node/npm, Python 3, and the Playwright browsers installed. The archive and manifests remain outside the upload directory.

```sh
npm ci --prefix showcase --ignore-scripts
npm run showcase:build
npm run showcase:typecheck
node showcase/scripts/verify-export.mjs > /tmp/usageflow-export-manifest.json
npm run showcase:test -- --project=chromium --project=webkit --workers=2 release.spec.ts
git rev-parse HEAD
python3 - <<'PY'
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path('showcase/out')
with ZipFile('/tmp/usageflow-showcase.zip', 'w', ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        if path.is_file():
            archive.write(path, path.relative_to(root))
PY
```

Stop if a check fails. Never set `SHOWCASE_TEST_BUILD=1` when preparing publication; the verifier rejects the test artifact. Record the source commit, archive SHA-256, manifest, and browser results. Upload `/tmp/usageflow-showcase.zip` in the existing Pages project's **Create deployment** flow, selecting production. The ZIP must have `index.html` at its root, not an enclosing `out` folder. Do not upload manifests, logs, screenshots, environment files, or the source tree.

## Verify the deployed origin

```sh
npm --prefix showcase run verify:host -- https://usageflow-showcase.pages.dev /tmp/usageflow-export-manifest.json
SHOWCASE_HOSTED_URL=https://usageflow-showcase.pages.dev npm --prefix showcase run test:hosted -- --project=chromium --project=webkit --workers=2
```

The host verifier checks exported bytes against the local SHA-256 manifest, the configured headers, font/text content types, and the actual 404 document. The hosted browser configuration runs only the release suite and starts no local server. It verifies direct navigation/refresh and the full keyboard journey at three widths, including history, monetary evidence, contact fallback, reset, accessibility scans, and a same-origin static-only network boundary.

Firefox is still configured and can be selected on a working host, but it fails before page load on the current Mac. Do not report it as passed. Full manual accessibility and first-time-user assessment remain later work; automated scans alone do not establish conformance. Preserve these limitations in publication evidence.

## Rollback and recovery

Record each successful production deployment ID, URL, source commit, and asset manifest. In the Pages project, open **Deployments**, find an earlier successful **production** deployment, choose its three-dot menu, then **Rollback to this deployment**. Preview deployments are not rollback targets. After rollback, run the hosted verifier with that earlier deployment's manifest and rerun the hosted browser suite.

The first publication has no earlier production deployment to roll back to. Retain its ZIP and manifest outside the site; if a later update fails, restore the earlier successful deployment. If the first publication itself fails verification, correct and re-upload the verified artifact before promoting its URL as ready. Deleting the project is not the routine rollback mechanism.

Reference: [Cloudflare Pages rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/). Dashboard rollback is documented here; do not claim a live rollback drill unless one was actually performed.
