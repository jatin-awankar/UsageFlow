# Ticket 04 — Accessibility and presentation

Status: ready-for-human

## Scope

Review the existing design with keyboard, narrow layouts, dialogs, enlarged text, touch emulation and accessible names. Fix observed presentation issues, capture a reproducible walkthrough, and document which checks are automated, agent-operated or still need human feedback. No full WCAG conformance claim or backend change. No public deployment in this ticket.

## Acceptance

- Unique page titles, clear focus and usable touch targets.
- Entry, contact, quantity error recovery, approval, payload inspection and reset work at 320px; short dialogs remain scrollable with controls reachable.
- Reflow at 320 CSS px and 200% text-resize stress checks, plus mobile touch emulation.
- Full normal browser regression checks and export/type checks; record unavailable browsers honestly.
- Review captures, a walkthrough recording with text alternative, and a human feedback checklist.
- Actual assistive-technology and physical-device results remain explicitly pending when unavailable.

## Delivery

Branch: `codex/recruiter-04-accessibility`, based on Ticket 03 merge `88b09d0` in `codex/showcase-contact-fallback`.

## Results

Added route titles, comfortable standalone link targets, visible payload focus and wrapped payload JSON. Added presentation regression checks and a reproducible walkthrough recorder. Build/type/export checks passed. Full Chromium/WebKit suite: 156 passed, 50 scenario-only skips, two timing failures; both passed unchanged in a single-worker recheck. Firefox still fails before page load. Local review found no blocking code issue.

Evidence: `showcase/review/accessibility-2026-10-26/README.md`. Native zoom, screen-reader audio, physical-device testing and independent recruiter feedback remain pending using the adjacent checklist. Do not mark these as passed or claim WCAG conformance. No public update was deployed.

Draft PR: https://github.com/jatin-awankar/UsageFlow/pull/122 (open; base `codex/showcase-contact-fallback`). Implementation commit: `276d389`.
