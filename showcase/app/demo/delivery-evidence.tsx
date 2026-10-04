import { useSession } from "../session";
import { FinalizedEvidence } from "./finalization";

export function DeliveryEvidence() {
  const { run, dispatch } = useSession();
  const {
    finalization,
    deliveryTarget: target,
    deliveryAttempt: attempt,
  } = run;
  return (
    <section
      aria-label="Simulated webhook delivery"
      className="delivery-evidence"
    >
      {!finalization ? (
        <p id="delivery-reason">
          Not yet created. Finalize the monthly BillingRecord first. No webhook
          event or delivery attempt exists.
        </p>
      ) : (
        <>
          <p id="delivery-reason">
            {attempt
              ? "DELIVERED · Simulated success"
              : target
                ? "PENDING · No delivery attempt"
                : "NO_TARGET · No selected endpoint. Delivery cannot succeed."}
          </p>
          <p className="small">
            Event creation is separate from delivery. This demonstration never
            sends a receiver request or verifies a signature.
          </p>
          <details>
            <summary>Inspect selected synthetic endpoint</summary>
            {target ? (
              <dl className="facts">
                <div>
                  <dt>Endpoint identity</dt>
                  <dd>{target.id}</dd>
                </div>
                <div>
                  <dt>Synthetic address · never contacted</dt>
                  <dd>{target.url}</dd>
                </div>
                <div>
                  <dt>Selected event</dt>
                  <dd>
                    {finalization.event.id} · {finalization.event.type}
                  </dd>
                </div>
              </dl>
            ) : (
              <p>No endpoint selected.</p>
            )}
          </details>
          <details>
            <summary>Inspect webhook payload</summary>
            <p className="small">
              {finalization.event.id} · {finalization.event.type} · Created{" "}
              {finalization.event.createdAt}. Source references belong to the
              frozen version below; they are not extra payload fields.
            </p>
            <pre role="region" aria-label="Webhook payload JSON" tabIndex={0}>
              {JSON.stringify(finalization.event.payload, null, 2)}
            </pre>
          </details>
        </>
      )}
      <button
        className="primary mt-5"
        disabled={!finalization || !target}
        aria-disabled={Boolean(attempt)}
        aria-describedby="delivery-reason"
        onClick={() => dispatch({ type: "deliver" })}
      >
        Simulate delivery
      </button>
      {attempt && (
        <>
          <div
            className="reconciliation"
            role="region"
            aria-label="Successful simulated attempt"
          >
            <h3>Successful simulated attempt</h3>
            <dl className="facts">
              <div>
                <dt>Attempt</dt>
                <dd>{attempt.id}</dd>
              </div>
              <div>
                <dt>Event</dt>
                <dd>{attempt.eventId}</dd>
              </div>
              <div>
                <dt>Endpoint</dt>
                <dd>{attempt.endpointId}</dd>
              </div>
              <div>
                <dt>Attempted at · scenario UTC</dt>
                <dd>{attempt.attemptedAt}</dd>
              </div>
              <div>
                <dt>Simulated response</dt>
                <dd>{attempt.responseCode} · DELIVERED</dd>
              </div>
            </dl>
            <p>Attempts: 1 · No HTTP request occurred.</p>
          </div>
          <section
            aria-label="Completion actions"
            className="completion-actions"
          >
            <p className="eyebrow">The evidence is connected</p>
            <h3>Explore what a pilot could look like.</h3>
            <p>
              Pilot discussions are exploratory. Onboarding is subject to
              readiness review.
            </p>
            {run.contactDestination ? (
              <a className="primary" href={run.contactDestination}>
                Discuss a pilot
              </a>
            ) : (
              <button
                className="primary"
                aria-disabled="true"
                aria-describedby="contact-blocker"
              >
                Discuss a pilot
              </button>
            )}
            <a
              className="secondary"
              href="https://github.com/jatin-awankar/UsageFlow"
            >
              Inspect the implementation
            </a>
            <p id="contact-blocker" className="small">
              {run.contactDestination
                ? "Opens your email app. No message is sent automatically."
                : "Contact destination awaiting verification. Publication remains blocked."}
            </p>
          </section>
        </>
      )}
      {finalization && <FinalizedEvidence result={finalization} />}
    </section>
  );
}
