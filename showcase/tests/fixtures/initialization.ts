// Build-time replacement. This module is never in the normal browser bundle.
export function createInitializer(): (attempt: number) => Promise<void> {
  const configuration = new URLSearchParams(window.location.search).get(
    "test-init",
  );
  return async (attempt) => {
    if (configuration === "delay" && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    if (configuration === "fail-once" && attempt === 0) {
      throw new Error("Isolated initialization fixture failure");
    }
  };
}
