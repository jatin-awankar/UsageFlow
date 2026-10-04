import type { AcceptedEvent } from "../run";
export function AcceptedEvidence({ event }: { event: AcceptedEvent }) {
  const facts = [
    ["Event ID", event.id],
    ["Customer", event.customer],
    ["Metric", event.metric],
    ["Accepted quantity", String(event.quantity)],
    ["Occurred at", event.occurredAt],
    ["Received at", event.receivedAt],
    ["Idempotency key", event.idempotencyKey],
    ["Processing", "PENDING"],
    ["Reconciliation", "LEDGER_PENDING"],
    ["Rating", "Awaiting processing"],
    ["Visitor contribution", "Not created"],
  ];
  return (
    <section aria-label="Accepted event evidence" className="accepted-evidence">
      <h3>Accepted. Kept as evidence.</h3>
      <p className="small">
        These accepted facts are immutable. Reset the demo to edit quantity.
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
