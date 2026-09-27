type Source = { eventId: string; amount: string; currency: string; ratingId: string; priceVersionId: string | null; correctionId: string | null };
type Event = { eventId: string; receivedAt: string | null };

function units(amount: string): bigint {
  const match = /^(\d+)\.(\d{3})$/.exec(amount);
  if (!match) throw new RangeError("Invalid persisted rated amount");
  return BigInt(match[1]) * 1000n + BigInt(match[2]);
}

function signedAmount(value: bigint): string {
  const magnitude = value < 0n ? -value : value;
  return `${value < 0n ? "-" : "+"}${magnitude / 1000n}.${(magnitude % 1000n).toString().padStart(3, "0")}`;
}

export function compareDrafts(previous: { id: string; calculatedAt: Date; ratedSources: unknown; sourceEvents: unknown; reconciliation: unknown } | null,
  current: { ratedSources: Source[]; sourceEvents: Event[]; total: string; currency: string | null; periodEnd: Date; closeAt: Date }) {
  if (!previous) return null;
  const oldSources = previous.ratedSources as Source[];
  const oldEvents = previous.sourceEvents as Event[];
  const oldTotal = (previous.reconciliation as { rated: { amount: string; currency: string | null } }).rated.amount;
  const oldById = new Map(oldSources.map((source) => [source.eventId, source]));
  const newById = new Map(current.ratedSources.map((source) => [source.eventId, source]));
  const oldEventIds = new Set(oldEvents.map((event) => event.eventId));
  const newEvents = new Map(current.sourceEvents.map((event) => [event.eventId, event]));
  const changes = [...new Set([...oldEventIds, ...newEvents.keys()])].sort().flatMap((eventId) => {
    const before = oldById.get(eventId), after = newById.get(eventId);
    const delta = units(after?.amount ?? "0.000") - units(before?.amount ?? "0.000");
    if (oldEventIds.has(eventId) && newEvents.has(eventId) && delta === 0n && before?.ratingId === after?.ratingId && before?.priceVersionId === after?.priceVersionId && before?.correctionId === after?.correctionId) return [];
    const event = newEvents.get(eventId);
    const lateArrival = !!event?.receivedAt && new Date(event.receivedAt) > current.periodEnd && new Date(event.receivedAt) <= current.closeAt;
    const kind = !newEvents.has(eventId) ? "REMOVED" : !oldEventIds.has(eventId) ? "ADDED" : !before && after ? "NEWLY_RATED" : "RATING_CHANGED";
    return [{ eventId, kind, lateArrival, previous: before ?? null, current: after ?? null, amountDifference: signedAmount(delta) }];
  });
  const difference = units(current.total) - units(oldTotal);
  if (changes.reduce((sum, change) => sum + units(change.amountDifference.slice(1)) * (change.amountDifference[0] === "-" ? -1n : 1n), 0n) !== difference) {
    throw new Error("Draft comparison does not reconcile");
  }
  const contribution = (filter: (change: typeof changes[number]) => boolean) => signedAmount(changes.filter(filter).reduce((sum, change) =>
    sum + units(change.amountDifference.slice(1)) * (change.amountDifference[0] === "-" ? -1n : 1n), 0n));
  return { previousSnapshotId: previous.id, previousCalculatedAt: previous.calculatedAt.toISOString(),
    previousTotal: oldTotal, currentTotal: current.total, amountDifference: signedAmount(difference),
    currency: current.currency ?? (previous.reconciliation as { rated: { currency: string | null } }).rated.currency,
    lateArrivalContribution: contribution((change) => change.kind === "ADDED" && change.lateArrival),
    ratingRecoveryContribution: contribution((change) => change.kind === "NEWLY_RATED"), changes };
}
