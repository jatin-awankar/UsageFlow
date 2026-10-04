import type { Run } from "../run";
export function AcceptedEvidence({ run }: { run: Run }) {
  const { event, processed, rating } = run;
  if (!event) return null;
  const facts = [
    ["Event ID", event.id],
    ["Customer", event.customer],
    ["Metric", event.metric],
    ["Accepted quantity", String(event.quantity)],
    ["Occurred at", event.occurredAt],
    ["Received at", event.receivedAt],
    ["Idempotency key", event.idempotencyKey],
    ["Processing", processed ? "PROCESSED" : "PENDING"],
    [
      "Reconciliation",
      rating ? "RATED" : processed ? "RATING_PENDING" : "LEDGER_PENDING",
    ],
    [
      "Rating",
      rating ? "Rated" : processed ? "Awaiting rating" : "Awaiting processing",
    ],
    ["Visitor contribution", rating ? `INR ${rating.display}` : "Not created"],
  ];
  return (
    <section aria-label="Accepted event evidence" className="accepted-evidence">
      <h3>Accepted. Kept as evidence.</h3>
      <p className="small">
        Identity, billable fields and times are immutable. Processing and rating
        add evidence. Reset the demo to edit quantity.
      </p>
      <dl className="facts">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
