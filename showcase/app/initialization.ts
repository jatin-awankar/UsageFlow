import type { Run } from "./run";
// Normal builds only prepare local data; no network or configurable fixtures.
export function createInitializer(): (
  attempt: number,
) => Promise<Run | undefined> {
  return async () => undefined;
}

export function createRatingAction(): () => boolean {
  return () => true;
}

export function createFinalizationAction(): () => boolean {
  return () => true;
}
