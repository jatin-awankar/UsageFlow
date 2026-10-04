"use client";
import { useRef, useEffect } from "react";
import { Dialog } from "radix-ui";
import { ArrowRight, RotateCcw, LockKeyhole, Calculator } from "lucide-react";
import { useSession } from "../session";
import { validDemoQuantity } from "../run";
import { PricingEvidence } from "./pricing-evidence";
import { AcceptedEvidence } from "./accepted-evidence";
import {
  MonthlyEvidence,
  MonthlySources,
  MonthlyTime,
} from "./monthly-evidence";
import { monthlyDraft } from "../monthly";
import { contributionTotal } from "../pricing";
const chapters = [
  {
    name: "Accept usage",
    title: "A little usage. A lasting record.",
    description:
      "Orbit Studio made API calls. Prepare the quantity for an immutable usage record.",
    action: "Accept event",
    reason:
      "Accepting preserves a usage fact. Processing and rating follow separately.",
  },
  {
    name: "Inspect pricing",
    title: "The price at that moment.",
    description:
      "Occurrence time selects the applicable PriceVersion. Processing and rating are separate from acceptance.",
    action: "Process & rate event",
    reason:
      "Simulate processing and rating explicitly. Acceptance alone does not create a contribution.",
  },
  {
    name: "Monthly record",
    title: "Close the month. Review the evidence.",
    description:
      "A monthly BillingRecord sums individually rounded contributions for one Customer. It is a comparison calculation.",
    action: "Finalize monthly record",
    reason:
      "Not available yet. Requires reconciled usage, time strictly after the inclusive close, and explicit owner approval. No finalized version exists.",
  },
  {
    name: "Webhook delivery",
    title: "A record your system can follow.",
    description:
      "A finalized version will connect to a webhook event and a distinct simulated delivery attempt.",
    action: "Simulate delivery",
    reason:
      "Not available yet. Requires a finalized BillingRecord and a simulated delivery attempt. No webhook event or delivery attempt exists.",
  },
];
export default function Demo() {
  const { run, dispatch } = useSession();
  const {
    quantity,
    chapter,
    error,
    event,
    retries,
    announcement,
    baseline: baselineEvents,
  } = run;
  const baselineTotal = contributionTotal(
    baselineEvents.map((source) => source.exact),
  );
  const heading = useRef<HTMLHeadingElement>(null);
  const quantityInput = useRef<HTMLInputElement>(null);
  const cancelReset = useRef<HTMLButtonElement>(null);
  const confirmedReset = useRef(false);
  useEffect(() => {
    if (run.phase === "ready" && run.attempt > 0)
      quantityInput.current?.focus();
  }, [run.phase, run.attempt]);
  const current = chapters[chapter];
  function selectChapter(index: number) {
    dispatch({ type: "chapter", value: index });
    requestAnimationFrame(() => heading.current?.focus());
  }
  if (run.phase !== "ready")
    return (
      <section className="workspace" aria-label="Demo initialization">
        <h1>Preparing the annotated ledger.</h1>
        {run.phase === "loading" ? (
          <p role="status">Preparing your local demo…</p>
        ) : (
          <>
            <p role="alert">
              Your local demo could not be prepared. No event was accepted. Try
              again or reset initialization.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                className="primary"
                onClick={() => dispatch({ type: "recover" })}
              >
                Retry initialization
              </button>
              <button
                className="secondary"
                onClick={() => dispatch({ type: "recover" })}
              >
                Reset initialization
              </button>
            </div>
          </>
        )}
      </section>
    );
  return (
    <div className="workspace">
      <div className="workspace-title">
        <div>
          <p className="eyebrow">The annotated ledger / Demo workspace</p>
          <h1>One customer. One month.</h1>
        </div>
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <button className="text-button">
              <RotateCcw size={17} aria-hidden="true" /> Reset demo
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content
              className="dialog-content"
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                cancelReset.current?.focus();
              }}
              onCloseAutoFocus={(event) => {
                if (confirmedReset.current) {
                  event.preventDefault();
                  confirmedReset.current = false;
                  quantityInput.current?.focus();
                }
              }}
            >
              <Dialog.Title>Reset this demonstration?</Dialog.Title>
              <Dialog.Description>
                This clears your accepted event, rating evidence and retry
                history, restores quantity 1,250, the initial scenario clock and
                the first chapter. The two synthetic baseline events stay
                unchanged. No real data is affected.
              </Dialog.Description>
              <div className="flex flex-wrap gap-3 mt-6">
                <Dialog.Close asChild>
                  <button
                    className="primary"
                    onClick={() => {
                      confirmedReset.current = true;
                      dispatch({ type: "reset" });
                    }}
                  >
                    Start fresh
                  </button>
                </Dialog.Close>
                <Dialog.Close asChild>
                  <button ref={cancelReset} className="secondary">
                    Keep exploring
                  </button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <div className="scenario-line">
        <span>
          Organization <strong>Northstar API</strong>
        </span>
        <span>
          Customer <strong>Orbit Studio</strong>
        </span>
        <span>September 2026 · INR</span>
      </div>
      <p className="small session-note">
        Progress stays in this tab while you explore. Reload to start fresh.
      </p>
      <nav className="chapter-nav" aria-label="Demo chapters">
        {chapters.map((item, index) => (
          <button
            key={item.name}
            aria-current={index === chapter ? "step" : undefined}
            onClick={() => selectChapter(index)}
          >
            <span>0{index + 1}</span>
            <span>
              {item.name}
              <small>
                {index === 0
                  ? event
                    ? "Event accepted"
                    : "Prepare your event"
                  : index === 1
                    ? run.rating
                      ? "Rated evidence"
                      : "Inspect & simulate"
                    : index === 2
                      ? "Review the draft"
                      : "Not yet available"}
              </small>
            </span>
          </button>
        ))}
      </nav>
      <div className="editorial-body">
        <section className="chapter-main" aria-labelledby="chapter-title">
          <div className="section-kicker">
            <span>
              0{chapter + 1} / {current.name}
            </span>
            <span className="status">
              {chapter === 0
                ? event
                  ? "Accepted"
                  : "Prepared"
                : chapter === 1
                  ? run.rating
                    ? "Rated"
                    : event
                      ? run.processed
                        ? "Awaiting rating"
                        : "Awaiting processing"
                      : "Accept usage first"
                  : chapter === 2
                    ? monthlyDraft(run).state
                    : "Not yet created"}
            </span>
          </div>
          <h2 id="chapter-title" ref={heading} tabIndex={-1}>
            {current.title}
          </h2>
          <p className="chapter-description">{current.description}</p>
          {chapter === 0 ? (
            <>
              <div className="input-row">
                <div>
                  <label htmlFor="quantity">Quantity · API calls</label>
                  <input
                    id="quantity"
                    ref={quantityInput}
                    inputMode="numeric"
                    value={quantity}
                    readOnly={Boolean(event)}
                    onChange={(event) =>
                      dispatch({ type: "quantity", value: event.target.value })
                    }
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                      error ? "quantity-help quantity-error" : "quantity-help"
                    }
                  />
                </div>
                <p>
                  INR 0.0025<span>per API call</span>
                </p>
              </div>
              <p id="quantity-help" className="small">
                Demo range: 1–10,000 whole calls. This is not an API limit.
                Editing does not accept or rate an event.
              </p>
              {error && (
                <p id="quantity-error" role="alert">
                  {error}
                </p>
              )}
              {!event && (
                <dl className="facts">
                  <div>
                    <dt>Customer reference</dt>
                    <dd>orbit_studio</dd>
                  </div>
                  <div>
                    <dt>Metric</dt>
                    <dd>API_CALL</dd>
                  </div>
                  <div>
                    <dt>Occurred at</dt>
                    <dd>28 Sep 2026, 14:32:00 UTC</dd>
                  </div>
                  <div>
                    <dt>Prepared receipt time</dt>
                    <dd>{run.clock}</dd>
                  </div>
                </dl>
              )}
            </>
          ) : chapter === 1 ? (
            <>
              <p className="small">
                Price applies from 01 Sep 2026, 00:00 UTC. The event’s
                occurrence selects its version, not receipt or the time you
                click Rate.
              </p>
              {event ? (
                <AcceptedEvidence run={run} />
              ) : (
                <p>
                  No visitor rating or contribution exists. Accept usage in
                  chapter 01.
                </p>
              )}
            </>
          ) : chapter === 2 ? (
            <>
              <MonthlyEvidence run={run} />
              <MonthlyTime run={run} dispatch={dispatch} />
            </>
          ) : null}
          {chapter === 0 && event && <AcceptedEvidence run={run} />}
          <div className="unavailable">
            {chapter === 1 ? (
              <Calculator size={19} aria-hidden="true" />
            ) : (
              <LockKeyhole size={19} aria-hidden="true" />
            )}
            <p id="prerequisite">
              {chapter === 1 && run.rating
                ? "Already rated. Identical retries retain this event and its contribution."
                : current.reason}
            </p>
          </div>
          <button
            className="primary mt-5 mr-3"
            disabled={
              chapter === 0 ? Boolean(event) : chapter === 1 ? !event : true
            }
            aria-disabled={
              chapter === 1 && Boolean(run.rating) ? true : undefined
            }
            onClick={() => {
              dispatch({ type: chapter === 1 ? "rate" : "accept" });
              if (chapter === 0 && !validDemoQuantity(quantity))
                quantityInput.current?.focus();
            }}
            aria-describedby="prerequisite"
          >
            {current.action} <ArrowRight size={17} aria-hidden="true" />
          </button>
          {chapter <= 1 && event && (
            <button
              className="secondary mt-5"
              onClick={() => dispatch({ type: "retry" })}
            >
              Retry identical event
            </button>
          )}
          {chapter === 1 && run.ratingError && (
            <p role="alert">{run.ratingError}</p>
          )}
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="small mt-3"
          >
            {announcement}
          </p>
          <p className="small">Visitor events: {event ? 1 : 0}</p>
          <p className="small">Identical retries: {retries}</p>
          <p className="small mt-3">
            Local simulation · No API request is sent.
          </p>
          <div className="chapter-next">
            {chapter > 0 && (
              <button
                className="text-button"
                onClick={() => selectChapter(chapter - 1)}
              >
                Previous chapter
              </button>
            )}
            {chapter < 3 && (
              <button
                className="text-button"
                onClick={() => selectChapter(chapter + 1)}
              >
                Next: {chapters[chapter + 1].name}{" "}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
        <aside
          className="margin-evidence"
          aria-label="Synthetic pricing and baseline evidence"
        >
          {chapter === 1 && <PricingEvidence run={run} />}
          {chapter === 2 ? (
            <MonthlySources run={run} />
          ) : (
            <>
              <p className="eyebrow">Before this event / Source notes</p>
              <h2>Already in the ledger.</h2>
              <p className="small">
                Synthetic, previously rated events. Visitor usage is not
                included in this baseline total.
              </p>
              <div className="ledger-block">
                {baselineEvents.map((event) => (
                  <article key={event.id} className="baseline-event">
                    <div className="ledger-row">
                      <h3>{event.quantity.toLocaleString("en-IN")} calls</h3>
                      <strong>INR {event.display}</strong>
                    </div>
                    <p className="source-id">{event.id}</p>
                    <p className="small">{event.occurred}</p>
                    <details>
                      <summary>
                        Inspect {event.quantity.toLocaleString("en-IN")}-call
                        source
                      </summary>
                      <dl className="facts">
                        <div>
                          <dt>Occurred / received</dt>
                          <dd>{event.exactTime}</dd>
                        </div>
                        <div>
                          <dt>Customer</dt>
                          <dd>orbit_studio</dd>
                        </div>
                        <div>
                          <dt>Metric</dt>
                          <dd>API_CALL</dd>
                        </div>
                        <div>
                          <dt>Ledger / rating</dt>
                          <dd>PROCESSED / RATED</dd>
                        </div>
                        <div>
                          <dt>PriceVersion</dt>
                          <dd>pv_api_sep_01</dd>
                        </div>
                        <div>
                          <dt>Exact rated amount</dt>
                          <dd>INR {event.exact}</dd>
                        </div>
                      </dl>
                    </details>
                  </article>
                ))}
                <div className="ledger-total">
                  <span>
                    Baseline total
                    <small>
                      {baselineEvents.length} events ·{" "}
                      {baselineEvents
                        .reduce((sum, source) => sum + source.quantity, 0)
                        .toLocaleString("en-IN")}{" "}
                      calls
                    </small>
                  </span>
                  <strong>INR {baselineTotal.display}</strong>
                </div>
                <p className="small">
                  Exact baseline amount: INR {baselineTotal.exact}
                </p>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
