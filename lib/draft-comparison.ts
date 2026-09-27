import { persistedRatedAmountUnits, signedPersistedRatedAmount } from "@/lib/persisted-rated-amount";

type Source = { eventId: string; amount: string; currency: string; ratingId: string; priceVersionId: string | null; correctionId: string | null };
type Event = { eventId: string; receivedAt: string | null };

function changeUnits(change: { amountDifference: string }): bigint {
  const value = change.amountDifference;
  return persistedRatedAmountUnits(value.slice(1)) * (value[0] === "-" ? -1n : 1n);
}

export function compareDrafts(previous: { id: string; calculatedAt: Date; ratedSources: unknown; sourceEvents: unknown; reconciliation: unknown } | null,
  current: { ratedSources: Source[]; sourceEvents: Event[]; total: string; currency: string | null; periodEnd: Date; closeAt: Date }) {
  if (!previous) return null;
  const oldSources = previous.ratedSources as Source[];
  const oldEvents = previous.sourceEvents as Event[];
  const oldRated = (previous.reconciliation as { rated: { amount: string; currency: string | null } }).rated;
  const oldTotal = oldRated.amount;
  if (oldRated.currency && current.currency && oldRated.currency !== current.currency) {
    throw new Error("Cannot compare draft totals in different currencies");
  }
  const oldById = new Map(oldSources.map((source) => [source.eventId, source]));
  const newById = new Map(current.ratedSources.map((source) => [source.eventId, source]));
  const oldEventIds = new Set(oldEvents.map((event) => event.eventId));
  const newEvents = new Map(current.sourceEvents.map((event) => [event.eventId, event]));
  const changes = [...new Set([...oldEventIds, ...newEvents.keys()])].sort().flatMap((eventId) => {
    const before = oldById.get(eventId), after = newById.get(eventId);
    const delta = (after ? persistedRatedAmountUnits(after.amount) : 0n) - (before ? persistedRatedAmountUnits(before.amount) : 0n);
    if (oldEventIds.has(eventId) && newEvents.has(eventId) && delta === 0n && before?.ratingId === after?.ratingId && before?.priceVersionId === after?.priceVersionId && before?.correctionId === after?.correctionId) return [];
    const event = newEvents.get(eventId);
    const lateArrival = !!event?.receivedAt && new Date(event.receivedAt) > current.periodEnd && new Date(event.receivedAt) <= current.closeAt;
    const kind = !newEvents.has(eventId) ? "REMOVED" : !oldEventIds.has(eventId) ? "ADDED" : !before && after ? "NEWLY_RATED" : "RATING_CHANGED";
    return [{ eventId, kind, lateArrival, previous: before ?? null, current: after ?? null, amountDifference: signedPersistedRatedAmount(delta) }];
  });
  const difference = persistedRatedAmountUnits(current.total) - persistedRatedAmountUnits(oldTotal);
  if (changes.reduce((sum, change) => sum + changeUnits(change), 0n) !== difference) {
    throw new Error("Draft comparison does not reconcile");
  }
  const contribution = (filter: (change: typeof changes[number]) => boolean) => signedPersistedRatedAmount(changes.filter(filter).reduce((sum, change) => sum + changeUnits(change), 0n));
  return { previousSnapshotId: previous.id, previousCalculatedAt: previous.calculatedAt.toISOString(),
    previousTotal: oldTotal, currentTotal: current.total, amountDifference: signedPersistedRatedAmount(difference),
    currency: current.currency ?? oldRated.currency,
    lateArrivalContribution: contribution((change) => change.kind === "ADDED" && change.lateArrival),
    ratingRecoveryContribution: contribution((change) => change.kind === "NEWLY_RATED"), changes };
}
