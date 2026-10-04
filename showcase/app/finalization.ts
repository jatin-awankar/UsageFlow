import type { Run } from "./run";
import {
  monthlyDraft,
  periodStart,
  periodEnd,
  inclusiveClose,
} from "./monthly";

// Build detached, frozen evidence before publishing either result to the run.
// A fault before event creation discards the candidate version as well.
export function freezeFinalization(run: Run, failBeforeEvent = false) {
  const draft = monthlyDraft(run);
  if (draft.state !== "READY_FOR_REVIEW") throw new Error("Not eligible");
  const sourceEvents = Object.freeze(
    draft.sources.map(({ event }) => Object.freeze({ ...event })),
  );
  const ratedSources = Object.freeze(
    draft.sources.map(({ event, rating }) =>
      Object.freeze({
        eventId: event.id,
        price: Object.freeze({ ...rating!.price }),
        quantity: event.quantity,
        amount: rating!.exact,
        display: rating!.display,
      }),
    ),
  );
  const line = Object.freeze({
    id: "line_demo_api_sep_1",
    metric: "API_CALL",
    currency: "INR",
    quantity: draft.ratedQuantity,
    amount: draft.total.exact,
    sourceEventIds: Object.freeze(sourceEvents.map((event) => event.id)),
  });
  const version = Object.freeze({
    id: "brv_demo_sep_2026_1",
    billingRecordId: "br_demo_sep_2026",
    version: 1,
    organizationId: "org_demo_northstar",
    customerId: "orbit_studio",
    approvedById: "owner_demo_simulated",
    finalizedAt: run.clock,
    periodStart,
    periodEnd,
    closeAt: inclusiveClose,
    currency: "INR",
    amount: draft.total.exact,
    display: draft.total.display,
    sourceEvents,
    ratedSources,
    lines: Object.freeze([line]),
    reconciliation: Object.freeze({
      acceptedCount: sourceEvents.length,
      ratedCount: draft.ratedCount,
      acceptedQuantity: draft.acceptedQuantity,
      ratedQuantity: draft.ratedQuantity,
      balanced: true,
    }),
  });
  if (failBeforeEvent) throw new Error("Local finalization could not finish");
  const event = Object.freeze({
    id: "wh_demo_finalized_1",
    type: "invoice.finalized",
    createdAt: run.clock,
    status: "PENDING",
    billingRecordVersionId: version.id,
    payload: Object.freeze({
      organizationId: version.organizationId,
      billingRecordId: version.billingRecordId,
      customerId: version.customerId,
      periodStart,
      periodEnd,
      versionId: version.id,
      version: version.version,
      currency: version.currency,
      amount: version.amount,
    }),
  });
  return Object.freeze({ version, event });
}
export type Finalization = ReturnType<typeof freezeFinalization>;
