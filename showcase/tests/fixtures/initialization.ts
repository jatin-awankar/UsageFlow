import { freshRun, reduceRun, type Run } from "../../app/run";
// Build-time replacement. This module is never in the normal browser bundle.
export function createInitializer(): (
  attempt: number,
) => Promise<Run | undefined> {
  const configuration = new URLSearchParams(window.location.search).get(
    "test-init",
  );
  const pricing = new URLSearchParams(window.location.search).get(
    "test-pricing",
  );
  const monthly = new URLSearchParams(window.location.search).get(
    "test-monthly",
  );
  return async (attempt) => {
    if (monthly) {
      const seed = monthlyFixture(monthly);
      if (seed) return seed;
    }
    if (configuration === "delay" && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    if (configuration === "fail-once" && attempt === 0) {
      throw new Error("Isolated initialization fixture failure");
    }
    if (pricing === "processed") {
      const accepted = reduceRun(
        { ...freshRun(), phase: "ready" },
        { type: "accept" },
      );
      return { ...accepted, processed: true };
    }
    if (pricing === "occurrence") {
      const run = { ...freshRun(), clock: "2026-10-02T00:00:00.000Z" };
      return {
        ...run,
        prices: [
          ...run.prices,
          {
            id: "pv_api_oct_test",
            effectiveFrom: "2026-10-01T00:00:00.000Z",
            unitPrice: "0.0100",
          },
        ],
      };
    }
    return undefined;
  };
}

export function createRatingAction(): () => boolean {
  let fail =
    new URLSearchParams(window.location.search).get("test-pricing") ===
    "fail-once";
  return () => {
    if (fail) {
      fail = false;
      return false;
    }
    return true;
  };
}

function monthlyFixture(name: string): Run | undefined {
  const run = { ...freshRun(), phase: "ready" as const };
  if (name === "rounding")
    return {
      ...run,
      baseline: run.baseline.map((source) => ({
        ...source,
        quantity: source.quantity + 1,
      })),
    };
  if (name === "month-boundaries")
    return {
      ...run,
      baseline: [
        {
          ...run.baseline[0],
          exactTime: "2026-09-01T00:00:00.000Z",
          receivedAt: "2026-10-02T12:00:00.000Z",
        },
        {
          ...run.baseline[1],
          exactTime: "2026-09-30T23:59:59.999Z",
          receivedAt: "2026-10-02T12:00:00.000Z",
        },
        {
          id: "evt_oct_boundary",
          quantity: 100,
          exactTime: "2026-10-01T00:00:00.000Z",
          occurred: "01 Oct 2026",
          receivedAt: "2026-10-02T12:00:00.000Z",
          display: "0.25",
          exact: "0.250",
        },
      ],
    };
  const clocks: Record<string, string> = {
    "close-before": "2026-10-03T23:59:59.999Z",
    "close-exact": "2026-10-04T00:00:00.000Z",
    "close-after": "2026-10-04T00:00:00.001Z",
    pending: "2026-10-04T00:00:00.001Z",
    processed: "2026-10-04T00:00:00.001Z",
    inconsistent: "2026-10-04T00:00:00.001Z",
  };
  if (!clocks[name]) return undefined;
  const accepted = reduceRun(run, { type: "accept" });
  if (name === "pending" || name === "processed")
    return {
      ...accepted,
      clock: clocks[name],
      processed: name === "processed",
    };
  const rated = reduceRun(accepted, { type: "rate" });
  return {
    ...rated,
    clock: clocks[name],
    rating:
      name === "inconsistent" && rated.rating
        ? { ...rated.rating, eventId: "evt_mismatched_evidence" }
        : rated.rating,
  };
}
