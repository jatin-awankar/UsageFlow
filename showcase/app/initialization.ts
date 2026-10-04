// Normal builds only prepare local data; no network or configurable fixtures.
export function createInitializer(): (attempt: number) => Promise<void> {
  return async () => {};
}
