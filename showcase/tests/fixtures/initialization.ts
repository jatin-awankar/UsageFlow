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
  return async (attempt) => {
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
