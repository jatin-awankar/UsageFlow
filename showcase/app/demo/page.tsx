"use client";
import { useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { ArrowRight, RotateCcw, LockKeyhole } from "lucide-react";
import { useSession } from "../session";
import { baselineEvents } from "./baseline";
const chapters = [
  {
    name: "Accept usage",
    title: "A little usage. A lasting record.",
    description:
      "Orbit Studio made API calls. Prepare the quantity for an immutable usage record.",
    action: "Accept event",
    reason:
      "Acceptance is not available in this entry release. No visitor event has been created.",
  },
  {
    name: "Inspect pricing",
    title: "The price at that moment.",
    description:
      "Occurrence time selects the applicable PriceVersion. Processing and rating are separate from acceptance.",
    action: "Process & rate event",
    reason:
      "Not available yet. Requires an accepted event, then processing and rating. No visitor rating or contribution exists.",
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
  const { quantity, setQuantity } = useSession();
  const [chapter, setChapter] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const current = chapters[chapter];
  function selectChapter(index: number) {
    setChapter(index);
    requestAnimationFrame(() => heading.current?.focus());
  }
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
            <Dialog.Content className="dialog-content">
              <Dialog.Title>Reset this demonstration?</Dialog.Title>
              <Dialog.Description>
                Your edited quantity returns to 1,250 and the first chapter
                opens. The two synthetic baseline events stay unchanged. No real
                data is affected.
              </Dialog.Description>
              <div className="flex flex-wrap gap-3 mt-6">
                <Dialog.Close asChild>
                  <button
                    className="primary"
                    onClick={() => {
                      setQuantity("1250");
                      setChapter(0);
                    }}
                  >
                    Reset quantity
                  </button>
                </Dialog.Close>
                <Dialog.Close asChild>
                  <button className="secondary">Keep exploring</button>
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
                {index === 0 ? "Prepare your event" : "Not yet available"}
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
              {chapter === 0 ? "Prepared" : "Not yet created"}
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
                    inputMode="numeric"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    aria-describedby="quantity-help"
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
                  <dd>28 Sep 2026, 14:32:02 UTC</dd>
                </div>
              </dl>
            </>
          ) : chapter === 1 ? (
            <dl className="facts">
              <div>
                <dt>Prepared PriceVersion</dt>
                <dd>pv_api_sep_01</dd>
              </div>
              <div>
                <dt>Effective from</dt>
                <dd>01 Sep 2026, 00:00 UTC</dd>
              </div>
              <div>
                <dt>Unit price</dt>
                <dd>INR 0.0025 / API call</dd>
              </div>
              <div>
                <dt>Visitor contribution</dt>
                <dd>Not created</dd>
              </div>
            </dl>
          ) : chapter === 2 ? (
            <dl className="facts">
              <div>
                <dt>UTC month</dt>
                <dd>01 Sep → 01 Oct 2026 (end excluded)</dd>
              </div>
              <div>
                <dt>Inclusive late close</dt>
                <dd>04 Oct 2026, 00:00 UTC</dd>
              </div>
              <div>
                <dt>Scenario time</dt>
                <dd>28 Sep 2026, 14:32:02 UTC</dd>
              </div>
            </dl>
          ) : null}
          <div className="unavailable">
            <LockKeyhole size={19} aria-hidden="true" />
            <p id="prerequisite">{current.reason}</p>
          </div>
          <button
            className="primary mt-5"
            disabled
            aria-describedby="prerequisite"
          >
            {current.action} <ArrowRight size={17} aria-hidden="true" />
          </button>
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
          aria-label="Synthetic baseline evidence"
        >
          <p className="eyebrow">Before this event / Source notes</p>
          <h2>Already in the ledger.</h2>
          <p className="small">
            Two synthetic, previously rated events. Your prepared event is not
            included.
          </p>
          <div className="ledger-block">
            {baselineEvents.map((event) => (
              <article key={event.id} className="baseline-event">
                <div className="ledger-row">
                  <h3>{event.quantity} calls</h3>
                  <strong>INR {event.display}</strong>
                </div>
                <p className="source-id">{event.id}</p>
                <p className="small">{event.occurred}</p>
                <details>
                  <summary>Inspect {event.quantity}-call source</summary>
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
                Baseline total<small>2 events · 10,000 calls</small>
              </span>
              <strong>INR 25.00</strong>
            </div>
            <p className="small">Exact baseline amount: INR 25.000</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
