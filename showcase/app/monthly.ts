import type { Run, AcceptedEvent } from "./run";
import {
  contributionTotal,
  rateEvent,
  septemberPrice,
  type Rating,
} from "./pricing";

export const periodStart = "2026-09-01T00:00:00.000Z";
export const periodEnd = "2026-10-01T00:00:00.000Z";
export const inclusiveClose = "2026-10-04T00:00:00.000Z";
export const afterClose = "2026-10-04T00:00:00.001Z";
export type MonthlySource = {
  event: AcceptedEvent;
  processed: boolean;
  rating: Rating | null;
};
export function monthlyDraft(run: Run) {
  const allSources: MonthlySource[] = run.baseline.map((source) => ({
    event: {
      id: source.id,
      idempotencyKey: source.id,
      customer: "Orbit Studio · orbit_studio",
      metric: "API_CALL",
      quantity: source.quantity,
      occurredAt: source.exactTime,
      receivedAt: source.receivedAt ?? source.exactTime,
    },
    processed: true,
    rating: {
      eventId: source.id,
      price: septemberPrice,
      product: "",
      display: source.display,
      exact: source.exact,
    },
  }));
  if (run.event)
    allSources.push({
      event: run.event,
      processed: run.processed,
      rating: run.rating,
    });
  const sources = allSources.filter(
    ({ event }) =>
      event.occurredAt >= periodStart && event.occurredAt < periodEnd,
  );
  const excluded = allSources.filter((source) => !sources.includes(source));
  const rated = sources.filter((source) => source.rating !== null);
  const acceptedQuantity = sources.reduce(
    (sum, source) => sum + source.event.quantity,
    0,
  );
  const ratedQuantity = rated.reduce(
    (sum, source) => sum + source.event.quantity,
    0,
  );
  const total = contributionTotal(rated.map((source) => source.rating!.exact));
  // Reconciliation verifies evidence, including identity and occurrence-time price,
  // rather than treating elapsed time or equal counts as proof of readiness.
  const reconciled =
    new Set(sources.map((source) => source.event.id)).size === sources.length &&
    sources.length === rated.length &&
    acceptedQuantity === ratedQuantity &&
    sources.every(({ event, processed, rating }) => {
      if (!processed || !rating || rating.eventId !== event.id) return false;
      try {
        const expected = rateEvent(event, run.prices);
        return (
          rating.price.id === expected.price.id &&
          rating.price.unitPrice === expected.price.unitPrice &&
          rating.price.effectiveFrom === expected.price.effectiveFrom &&
          rating.exact === expected.exact &&
          rating.display === expected.display
        );
      } catch {
        return false;
      }
    });
  const state =
    run.clock <= inclusiveClose
      ? "OPEN"
      : reconciled
        ? "READY_FOR_REVIEW"
        : "BLOCKED";
  return {
    sources,
    excluded,
    ratedCount: rated.length,
    acceptedQuantity,
    ratedQuantity,
    total,
    reconciled,
    state,
  };
}
