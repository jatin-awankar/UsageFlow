import type { Run, Action } from "../run";
import { initialClock } from "../run";
import {
  monthlyDraft,
  periodStart,
  periodEnd,
  inclusiveClose,
  afterClose,
} from "../monthly";

export function MonthlyEvidence({ run }: { run: Run }) {
  const draft = monthlyDraft(run);
  return (
    <section aria-label="Monthly BillingRecord draft" className="monthly-draft">
      <p className="eyebrow">BillingRecord draft · br_demo_sep_2026</p>
      <div className="ledger-total">
        <span>
          September calculation<small>API_CALL · INR</small>
        </span>
        <strong>INR {draft.total.display}</strong>
      </div>
      <p className="small">
        Accepted: {draft.sources.length} events ·{" "}
        {draft.acceptedQuantity.toLocaleString("en-IN")} calls
      </p>
      <p className="small">
        Rated: {draft.ratedCount} events ·{" "}
        {draft.ratedQuantity.toLocaleString("en-IN")} calls
      </p>
      <p className="contribution-total">
        Exact line total: INR {draft.total.exact}
      </p>
      <p className="small">
        Exact BillingRecord total: INR {draft.total.exact}
      </p>
      <p className="small">
        Sum each individually rounded contribution. Unresolved sources have no
        amount; this total includes rated evidence only.
      </p>
      <p className="reconciliation">
        {draft.reconciled
          ? "Reconciled: accepted and rated sources, counts, quantities and exact contributions agree."
          : "Not reconciled: processing, rating or source evidence is unresolved or inconsistent. Review the source rows; elapsed time cannot resolve evidence."}
      </p>
      <p>
        Draft state: <strong>{draft.state}</strong>
      </p>
      <p className="small">
        {draft.state === "OPEN"
          ? "The inclusive late window is still open. Exactly at close remains OPEN."
          : draft.state === "BLOCKED"
            ? "The late window has closed, but unresolved evidence blocks readiness."
            : "Ready for owner review. Readiness is not approval."}{" "}
        No finalized version or outbound event exists.
      </p>
    </section>
  );
}
export function MonthlySources({ run }: { run: Run }) {
  const { sources, excluded } = monthlyDraft(run);
  return (
    <section aria-label="Monthly source evidence">
      <p className="eyebrow">September / Source notes</p>
      <h2>Every contribution accounted for.</h2>
      <p className="small">
        Occurrence selects this UTC month. Receipt time does not move usage
        between months.
      </p>
      {sources.map(({ event, processed, rating }) => (
        <article
          key={event.id}
          aria-label={`Source ${event.id}`}
          className="baseline-event"
        >
          <div className="ledger-row">
            <h3>{event.quantity.toLocaleString("en-IN")} calls</h3>
            <strong>
              {rating ? `INR ${rating.display}` : "No contribution yet"}
            </strong>
          </div>
          <p className="source-id">{event.id}</p>
          <p className="small">
            {processed ? "PROCESSED" : "PENDING"} /{" "}
            {rating ? "RATED" : processed ? "RATING_PENDING" : "LEDGER_PENDING"}
          </p>
          <details>
            <summary>Inspect source {event.id}</summary>
            <dl className="facts">
              <div>
                <dt>Customer / metric</dt>
                <dd>orbit_studio / API_CALL</dd>
              </div>
              <div>
                <dt>Occurred at · UTC</dt>
                <dd>{event.occurredAt}</dd>
              </div>
              <div>
                <dt>Received at · UTC</dt>
                <dd>{event.receivedAt}</dd>
              </div>
              <div>
                <dt>PriceVersion</dt>
                <dd>{rating ? rating.price.id : "Awaiting rating"}</dd>
              </div>
              {rating && (
                <>
                  <div>
                    <dt>Unit price</dt>
                    <dd>INR {rating.price.unitPrice} / call</dd>
                  </div>
                  <div>
                    <dt>Exact contribution</dt>
                    <dd>INR {rating.exact}</dd>
                  </div>
                </>
              )}
            </dl>
          </details>
        </article>
      ))}
      {excluded.length > 0 && (
        <div className="baseline-event">
          <h3>Outside September · excluded</h3>
          {excluded.map(({ event }) => (
            <p className="small" key={event.id}>
              {event.id} · {event.quantity} calls · occurred {event.occurredAt}{" "}
              · received {event.receivedAt}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
export function MonthlyTime({
  run,
  dispatch,
}: {
  run: Run;
  dispatch: React.Dispatch<Action>;
}) {
  const advanced = run.clock >= afterClose;
  return (
    <section aria-label="Scenario time transition" className="monthly-time">
      <h3>The month ends. The late window follows.</h3>
      <dl className="facts">
        <div>
          <dt>Period start · included</dt>
          <dd>{periodStart}</dd>
        </div>
        <div>
          <dt>Period end · excluded</dt>
          <dd>{periodEnd}</dd>
        </div>
        <div>
          <dt>Inclusive 72-hour close</dt>
          <dd>{inclusiveClose}</dd>
        </div>
        <div>
          <dt>Current scenario time</dt>
          <dd>{run.clock}</dd>
        </div>
        <div>
          <dt>Prepared time · before</dt>
          <dd>{initialClock}</dd>
        </div>
        <div>
          <dt>Review time · after</dt>
          <dd>{afterClose}</dd>
        </div>
      </dl>
      <p className="small" id="time-reason">
        Simulate the passage of the late window to inspect readiness, one
        millisecond after close. This explicit jump changes only scenario time,
        without waiting or changing your wall clock. It does not process, rate
        or approve usage.
      </p>
      <button
        className="secondary"
        aria-describedby="time-reason"
        aria-disabled={advanced}
        onClick={() => dispatch({ type: "advance-time" })}
      >
        Advance simulated time past close
      </button>
    </section>
  );
}
