"use client";
import { useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { useSession } from "../session";
import { monthlyDraft } from "../monthly";
import type { Finalization } from "../finalization";

export function FinalizeApproval() {
  const { run, dispatch } = useSession();
  const [open, setOpen] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const eligible = monthlyDraft(run).state === "READY_FOR_REVIEW";
  return (
    <>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button
            className="primary mt-5"
            aria-disabled={!eligible || Boolean(run.finalization)}
            aria-describedby="finalization-reason"
            onClick={(event) => {
              if (!eligible || run.finalization) {
                event.preventDefault();
                dispatch({ type: "finalize" });
              }
            }}
          >
            Finalize monthly record
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="dialog-content"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              cancel.current?.focus();
            }}
          >
            <Dialog.Title>Approve this simulated BillingRecord?</Dialog.Title>
            <Dialog.Description>
              As the simulated owner, freeze INR{" "}
              {monthlyDraft(run).total.display} for September and create one
              pending invoice.finalized event. This local comparison calculation
              is not a tax invoice, payment request or charge. No delivery
              occurs.
            </Dialog.Description>
            <div className="flex flex-wrap gap-3 mt-6">
              <Dialog.Close asChild>
                <button
                  className="primary"
                  onClick={() => dispatch({ type: "finalize" })}
                >
                  Approve simulated finalization
                </button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <button ref={cancel} className="secondary">
                  Keep reviewing
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <p id="finalization-reason" className="small mt-3">
        {run.finalization
          ? "Already finalized. Repeated approval preserves the same version and event."
          : eligible
            ? "Reconciled and after close. Explicit simulated owner approval is still required."
            : "Approval blocked until strictly after close and all source evidence reconciles."}
      </p>
      {run.finalizationError && <p role="alert">{run.finalizationError}</p>}
    </>
  );
}

export function FinalizedEvidence({ result }: { result: Finalization }) {
  const { version, event } = result;
  const { run } = useSession();
  return (
    <section
      aria-label="Finalized BillingRecord"
      className="monthly-draft frozen-evidence"
    >
      <p className="eyebrow">
        Frozen comparison calculation · Version {version.version}
      </p>
      <div className="ledger-total">
        <span>September · Simulated owner approval</span>
        <strong>INR {version.display}</strong>
      </div>
      <p className="contribution-total">
        Exact frozen total: INR {version.amount}
      </p>
      <p className="small">Finalized versions: 1 · Outbound events: 1</p>
      <dl className="facts">
        <div>
          <dt>BillingRecord</dt>
          <dd>{version.billingRecordId}</dd>
        </div>
        <div>
          <dt>Current frozen version</dt>
          <dd>{version.id}</dd>
        </div>
        <div>
          <dt>Approved by</dt>
          <dd>{version.approvedById}</dd>
        </div>
        <div>
          <dt>Finalized at · UTC</dt>
          <dd>{version.finalizedAt}</dd>
        </div>
      </dl>
      <p className="small">
        Accepted: {version.reconciliation.acceptedCount} events ·{" "}
        {version.reconciliation.acceptedQuantity.toLocaleString("en-IN")} calls
      </p>
      <p className="small">
        Rated: {version.reconciliation.ratedCount} events ·{" "}
        {version.reconciliation.ratedQuantity.toLocaleString("en-IN")} calls
      </p>
      <p className="small">
        Sources, occurrence-time prices, line references and exact amounts are
        frozen together. Revisiting the ledger or retrying cannot change this
        version.
      </p>
      {version.ratedSources.map((source) => (
        <p className="small" key={source.eventId}>
          Frozen source {source.eventId}: INR {source.display} · exact{" "}
          {source.amount}
        </p>
      ))}
      <details>
        <summary>Inspect frozen version</summary>
        <pre aria-label="Frozen version JSON">
          {JSON.stringify(version, null, 2)}
        </pre>
      </details>
      <div className="reconciliation">
        <h3>Linked event · frozen creation evidence</h3>
        <p className="source-id">
          {event.id} · {event.type}
        </p>
        <p className="small">Linked version: {event.billingRecordVersionId}</p>
        <p>
          {run.deliveryAttempt
            ? "Created PENDING · Delivery attempt recorded separately in chapter 04"
            : "PENDING · No delivery attempt"}
        </p>
        <p className="small">
          Event creation is separate from delivery. The technical event name
          invoice.finalized describes a BillingRecord comparison calculation,
          not a tax invoice or payment.
        </p>
      </div>
      <details>
        <summary>Inspect pending event payload</summary>
        <pre aria-label="Pending event JSON">
          {JSON.stringify(event, null, 2)}
        </pre>
      </details>
    </section>
  );
}
