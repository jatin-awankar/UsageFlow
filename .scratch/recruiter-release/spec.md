# Recruiter release roadmap

Status: ready-for-agent

## Objective

Make UsageFlow publicly accessible as a credible recruiter portfolio at zero hosting cost. Work one ticket at a time. The existing browser-only showcase is the first release; a reproducible real backend and a restricted hosted sandbox follow separately. A simulation is never evidence of real delivery, production capacity, or pilot readiness.

## Agreed sequence

1. Refresh showcase dependencies and release evidence; then prepare free static publication.
2. Improve recruiter positioning, guided navigation, accessibility, and presentation.
3. Make the real backend reproducible with synthetic seeds and an end-to-end acceptance journey.
4. Align quantity limits, processing/recovery execution, and operational visibility.
5. Add isolated demo sessions, quotas, cleanup, authorization, and outbound-request restrictions.
6. Measure free-tier feasibility before deploying a restricted real backend sandbox.
7. Improve repository documentation, continuous verification, and targeted refactoring.

Tickets 01–03 are complete. The current iteration authorizes ticket 04: accessibility and presentation review, fixes and walkthrough evidence. Later tickets are scoped when reached, using current evidence. No paid resource, PR merge, production-data change, backend deployment, or pilot-gate change is part of this iteration.

## Delivery workflow

Each implementation ticket has its own branch, acceptance checks, scoped commit, push, and draft PR. Preserve unrelated work. Record unavailable checks as unavailable. Use reviewed dependencies for stacked work and state the PR base explicitly. Customer-model changes retain the inventory and restored-copy safeguards in AGENTS.md and docs/customer-model-inventory.md.

## Comments

- 2026-10-24: User approved proceeding one ticket at a time, starting with the showcase baseline.
- 2026-10-24: After merging ticket 01 (PR #119) into the contact branch, the user authorized ticket 02: prepare and publish the free static showcase. Only the static showcase is in publication scope; backend deployment and later tickets remain separate.

- 2026-10-24: User authorized ticket 03 after ticket 02 merged as PR #120. Preserve the existing visual design; deliver a reviewed draft PR before updating the public export.

- 2026-10-26: User confirmed Ticket 03 merged and authorized Ticket 04. Human feedback and unavailable assistive-technology checks must remain distinct from automated evidence.
