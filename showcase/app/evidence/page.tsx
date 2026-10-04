import Link from "next/link";
import { PilotContact } from "../pilot-contact";
import { pilotContact } from "../contact";

// Pin claims to reviewed, merged evidence rather than a moving branch.
const source =
  "https://github.com/jatin-awankar/UsageFlow/blob/f6adc01f89a620d5a42d5790a759ff95af165d69/";
const workflow = [
  [
    "Accept an immutable fact",
    "The API key identifies the Organization. With an active subscription and configured metric, ingestion resolves an existing active Customer by its organization-scoped external ID. Acceptance commits a ledger-only UsageEvent and durable processing intent. Identical retries return the original event; changed billable fields conflict.",
    "app/api/track/route.ts",
    "Inspect ingestion and retry handling",
  ],
  [
    "Process, then rate",
    "Accepted is not rated. PENDING processing reconciles as LEDGER_PENDING. PROCESSED without a rating or other outcome remains RATING_PENDING. Rating selects the PriceVersion effective at occurrence time. Explicit UNRATED / NO_APPLICABLE_PRICE means missing price; it is different from a successfully rated zero.",
    "worker/processors/rateCustomerEvent.ts",
    "Inspect occurrence-time rating",
  ],
  [
    "Explain the amount",
    "Exact integer arithmetic rounds half-up once per event to the currency scale. For 1,250 calls at INR 0.0025, the exact product is 3.125, the displayed contribution is INR 3.13, and persisted-form evidence is 3.130. Monthly lines sum individually rounded events, without pricing the aggregate again. The demo range of 1–10,000 calls is not an API limit.",
    "lib/money-contract.ts",
    "Inspect exact money arithmetic",
  ],
  [
    "Review the UTC month",
    "A BillingRecord is a comparison calculation for one Customer and month, not a tax invoice or payment request. Occurrence time selects the UTC calendar month. The late window includes the exact close, 72 hours after next month starts. Only strictly after close can reconciled, fully rated usage become READY_FOR_REVIEW; unresolved usage blocks readiness.",
    "lib/billing-record-calculation.ts",
    "Inspect monthly reconciliation",
  ],
  [
    "Finalize with owner approval",
    "Readiness is not approval. The backend checks current owner authority and fresh reconciliation before explicit finalization. It atomically freezes a version and creates the linked invoice.finalized event. Identical bound requests are idempotent. Corrections use linked revisions; the finalized monetary record stays immutable.",
    "lib/billing-record-finalization.ts",
    "Inspect atomic finalization",
  ],
  [
    "Track delivery separately",
    "Creating an event is not successful delivery. The backend records selected targets, attempts, retries and terminal outcomes, with manual replay. No selected endpoint means NO_TARGET. Receivers deduplicate stable event IDs. The historical technical name invoice.finalized describes a BillingRecord notification; it does not collect payment.",
    "lib/webhooks/billing-status.ts",
    "Inspect delivery status semantics",
  ],
];

export default function Evidence() {
  return (
    <div className="evidence-page">
      <header className="evidence-intro">
        <p className="eyebrow">Behind the annotated ledger</p>
        <h1>How it works &amp; evidence</h1>
        <p className="intro">
          Follow the real backend contract. See what this browser demonstrates,
          and what still needs verification.
        </p>
        <Link className="primary" href="/demo/">
          Return to the current demo
        </Link>
        <p className="small">
          Progress stays in this tab while you explore. Reload to start fresh.
        </p>
      </header>
      <section className="evidence-section" aria-labelledby="parties">
        <div>
          <p className="eyebrow">01 / The parties</p>
          <h2 id="parties">Who owns the usage?</h2>
        </div>
        <div>
          <dl className="domain-definitions">
            <div>
              <dt>Organization · Northstar API</dt>
              <dd>
                The SaaS business operating the account and owning its billing
                data.
              </dd>
            </div>
            <div>
              <dt>Customer · Orbit Studio</dt>
              <dd>
                The Organization’s billed account, identified here by
                orbit_studio. A Customer is distinct from a User, the person
                with an Organization role.
              </dd>
            </div>
          </dl>
          <a href={`${source}CONTEXT.md`}>Read the domain glossary</a>
        </div>
      </section>
      <section className="evidence-section" aria-labelledby="backend">
        <div>
          <p className="eyebrow">02 / Real backend</p>
          <h2 id="backend">From fact to notification.</h2>
          <p>
            Source review: 4 October 2026, repository snapshot f6adc01. This is
            an implementation explanation, not a new live-system test.
          </p>
        </div>
        <ol className="workflow-evidence">
          {workflow.map(([title, description, path, label]) => (
            <li key={path}>
              <h3>{title}</h3>
              <p>{description}</p>
              <a href={`${source}${path}`}>{label}</a>
            </li>
          ))}
        </ol>
      </section>
      <section className="evidence-section" aria-labelledby="simulation">
        <div>
          <p className="eyebrow">03 / Browser demonstration</p>
          <h2 id="simulation">A synthetic run in this tab.</h2>
        </div>
        <div>
          <p>
            Quantity editing, acceptance, identical retries, processing and
            rating, scenario-time advancement, owner finalization and successful
            webhook delivery are all local simulations. Organization, Customer,
            usage, prices, identities, payload and endpoint are synthetic.
          </p>
          <p>
            No authentication, production API, database write, worker, receiver
            request, signature verification or payment collection occurs.
            Advancing time changes the scenario clock only. Reload clears the
            in-memory run; other tabs have independent runs.
          </p>
          <p>
            The demo shows one prepared happy path. It does not demonstrate real
            infrastructure recovery, receiver compatibility, capacity, instant
            onboarding or production readiness.
          </p>
          <a href={`${source}showcase/app/run.ts`}>
            Inspect the local simulation transitions
          </a>
        </div>
      </section>
      <section className="evidence-section" aria-labelledby="verification">
        <div>
          <p className="eyebrow">04 / Recorded verification</p>
          <h2 id="verification">Evidence has a boundary.</h2>
          <p>
            These are dated repository records. Their original environments and
            limitations still apply.
          </p>
        </div>
        <div className="verification-records">
          <article>
            <h3>Backend contract inspection · 3 October 2026</h3>
            <p>
              Read-only source inspection at fe6d3ae. Relevant backend files
              remain unchanged at this page’s reviewed snapshot. Includes the
              ingestion/rating quantity-cap discrepancy. Not an integration or
              production test.
            </p>
            <a href={`${source}docs/public-showcase-contract-verification.md`}>
              Read the backend contract verification
            </a>
          </article>
          <article>
            <h3>Webhook rehearsal · 28 September 2026</h3>
            <p>
              Recorded local synthetic PostgreSQL 17, Redis 7 and loopback
              receiver checks cover delivery, owner actions, secret rotation and
              deployed-gate behavior. Rollback required a type-only
              compatibility patch and an isolated Prisma client. No
              representative migration safety or live receiver compatibility is
              established.
            </p>
            <a href={`${source}docs/billing-webhook-readiness.md`}>
              Read local webhook readiness evidence
            </a>
          </article>
          <article>
            <h3>Representative operations · 2 October 2026</h3>
            <p>
              Later follow-ups supersede the initial source-backup blocker: an
              isolated PostgreSQL 17.11 restore, additive migrations, inventory,
              patched rollback and return to the corrected current build passed
              within the recorded scope. All 35 current-schema tables matched
              across application switches. Provider-level provenance remains
              independently unconfirmed; the copy had no Customer or
              BillingRecord rows. Authenticated owner behavior, sender replay,
              original-ID loss and RPO/RTO remain unmeasured.
            </p>
            <a href={`${source}docs/rollout-item-3-rehearsal-2026-10-02.md`}>
              Read the restored-copy rehearsal and limitations
            </a>
          </article>
          <article>
            <h3>Showcase delivery checks · 4 October 2026</h3>
            <p>
              Locally built static showcase: Chromium and WebKit checks and
              viewport captures. Firefox failed to launch, so its behavior
              remains unverified. These browser checks demonstrate local
              interactions, not backend integration, human usability or full
              accessibility conformance.
            </p>
            <a href={`${source}showcase/review/delivery/README.md`}>
              Read recorded browser checks and captures
            </a>
          </article>
        </div>
      </section>
      <section className="evidence-section" aria-labelledby="readiness">
        <div>
          <p className="eyebrow">05 / Still outstanding</p>
          <h2 id="readiness">Pilot gates remain closed.</h2>
        </div>
        <div>
          <p>
            Deployed Customer ingestion and owner finalization remain gated
            pending a separate rollout decision. The isolated-copy rehearsal
            does not establish authenticated owner behavior on representative
            billing records. Sender replay with original-ID reconciliation,
            receiver compatibility, and intended-host recovery evidence are
            still required.
          </p>
          <p>
            Human usability sessions and a full WCAG 2.2 AA accessibility
            assessment remain pending. Automated keyboard and layout checks do
            not establish conformance.
          </p>
          <a href={`${source}docs/rollout-item-3-rehearsal-2026-10-02.md`}>
            Inspect outstanding operations gates
          </a>
          <div className="completion-actions">
            <h3>Discuss a pilot</h3>
            <p>
              Pilot discussions are exploratory and subject to readiness review.
            </p>
            <p>
              Contact jatinawankar02@gmail.com for an exploratory discussion.
              Publication remains blocked: zero-cost static hosting is not confirmed.
            </p>
            <PilotContact destination={pilotContact} />
            <a
              className="secondary"
              href="https://github.com/jatin-awankar/UsageFlow"
            >
              Inspect the implementation
            </a>
            <Link className="primary" href="/demo/">
              Continue the current demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
