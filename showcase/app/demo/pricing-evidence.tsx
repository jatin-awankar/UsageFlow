import type { Run } from "../run";
import { contributionTotal } from "../pricing";
import { baselineEvents } from "./baseline";
export function PricingEvidence({ run }: { run: Run }) {
  const { event, rating } = run;
  const total = contributionTotal([
    ...baselineEvents.map((source) => source.exact),
    ...(rating ? [rating.exact] : []),
  ]);
  return (
    <section aria-label="Visitor pricing evidence" className="pricing-evidence">
      <p className="eyebrow">This event / Calculation notes</p>
      <h2>A contribution you can trace.</h2>
      {rating && event ? (
        <>
          <div className="ledger-row">
            <span>RATED contribution</span>
            <strong>INR {rating.display}</strong>
          </div>
          <details>
            <summary>Inspect event calculation</summary>
            <dl className="facts">
              <div>
                <dt>Event ID</dt>
                <dd>{rating.eventId}</dd>
              </div>
              <div>
                <dt>Occurrence selects price</dt>
                <dd>{event.occurredAt}</dd>
              </div>
              <div>
                <dt>Receipt (does not select price)</dt>
                <dd>{event.receivedAt}</dd>
              </div>
              <div>
                <dt>PriceVersion</dt>
                <dd>{rating.price.id}</dd>
              </div>
              <div>
                <dt>Effective from</dt>
                <dd>{rating.price.effectiveFrom}</dd>
              </div>
              <div>
                <dt>Unit price</dt>
                <dd>INR {rating.price.unitPrice} / API_CALL</dd>
              </div>
              <div>
                <dt>Exact multiplication</dt>
                <dd>
                  {event.quantity.toLocaleString("en-IN")} ×{" "}
                  {rating.price.unitPrice} = {rating.product}
                </dd>
              </div>
              <div>
                <dt>Exact persisted-form amount</dt>
                <dd>INR {rating.exact}</dd>
              </div>
            </dl>
            <p className="small">
              Multiply exactly, then round half-up once per event to two
              currency places. Three-place evidence pads that same amount; it
              does not round again. This is in-memory evidence, not database
              persistence.
            </p>
          </details>
        </>
      ) : (
        <p className="small">
          {event
            ? "No contribution yet. Explicit processing and rating create the evidence."
            : "Accept an event first. Its contribution will appear here after rating."}
        </p>
      )}
      <p className="small">
        Rated sources: {baselineEvents.length + (rating ? 1 : 0)} · Rated calls:{" "}
        {(
          baselineEvents.reduce((sum, source) => sum + source.quantity, 0) +
          (rating && event ? event.quantity : 0)
        ).toLocaleString("en-IN")}
      </p>
      <p className="contribution-total">
        Current contribution total: INR {total.display}
      </p>
      <p className="small">Exact total: INR {total.exact}</p>
      <p className="small">
        Sum of individually rounded sources. Monthly reconciliation and owner
        review follow in a later chapter.
      </p>
    </section>
  );
}
