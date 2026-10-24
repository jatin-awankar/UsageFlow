# 02: Publish the free static showcase

Status: ready-for-human

Parent: [Recruiter release roadmap](../spec.md).

## Scope

Publish the verified standalone `showcase/out` export on Cloudflare Pages Free with its provided subdomain. Use Direct Upload to publish exactly the locally verified artifact, with no repository-wide install, runtime functions, database, credentials, paid add-ons, or automatic Git deployment. Keep the existing Vercel application unchanged. Document repeatable updates, hosting constraints, and rollback.

Base: `947ed4d` on `origin/codex/showcase-contact-fallback`, containing merged ticket 01 / PR #119. PR #118 still awaits merging into main. Branch: `codex/recruiter-02-static-publication`; target the contact branch to avoid unrelated changes.

## Acceptance checks

- [x] Confirm a free static-only hosting configuration and its current limits; record the account plan without retaining credentials.
- [x] Build and verify the normal export, including access to the shared money module; retain a manifest tied to the release source commit.
- [x] Package only exported files, preserving nested route and Next navigation assets; no functions, environment files, test fixtures, or source tree in the upload.
- [x] Add a repeatable hosted release check and run local release tests before upload.
- [x] Publish the reviewed artifact, then verify public HTTPS routes, refresh/navigation, assets/fonts/notices, unknown-page 404, and the full browser simulation on desktop/mobile widths.
- [x] Record the public URL, deployment identifier, source commit, asset verification, and passing/failed/unavailable checks. Carry forward Firefox and manual accessibility/usability limitations honestly.
- [x] Document update and rollback steps, including the lack of a previous production rollback target for the first release.
- [ ] Commit, push, and open a scoped draft PR; do not merge PRs or begin ticket 03.

## Comments

- 2026-10-24: User authorized this ticket and signed into Cloudflare. Ticket 01's Chromium/WebKit baseline passes; Firefox cannot launch on this Mac. The prior Vercel Hobby eligibility blocker is avoided by using the separately verified Cloudflare free static offering. No claim of three-engine coverage or full accessibility conformance will be made.
- 2026-10-24 implementation: Published [usageflow-showcase.pages.dev](https://usageflow-showcase.pages.dev/) from `e4586b0`. Cloudflare Free plan confirmed; 54 archive entries (53 assets plus headers config), no runtime functions or environment variables. Eight local and eight hosted release checks pass; all deployed asset hashes and the exact 404 document match. [Publication evidence](../../../showcase/review/publication-2026-10-24/README.md). Update/rollback instructions are recorded. Firefox and manual accessibility/usability limitations remain explicit. Ticket 03 has not started.
