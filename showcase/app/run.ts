// The run belongs to one mounted provider. Accepted facts never change on retries.
export const initialClock = "2026-09-28T14:32:02.000Z";
export function validDemoQuantity(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 10000;
}
export type AcceptedEvent = Readonly<{
  id: string;
  idempotencyKey: string;
  customer: string;
  metric: string;
  quantity: number;
  occurredAt: string;
  receivedAt: string;
}>;
export type Run = {
  phase: "loading" | "ready" | "error";
  attempt: number;
  quantity: string;
  chapter: number;
  clock: string;
  event: AcceptedEvent | null;
  retries: number;
  error: string;
  announcement: string;
};
export function freshRun(): Run {
  return {
    phase: "loading",
    attempt: 0,
    quantity: "1250",
    chapter: 0,
    clock: initialClock,
    event: null,
    retries: 0,
    error: "",
    announcement: "",
  };
}
export type Action =
  | { type: "initialized" }
  | { type: "initialization-failed" }
  | { type: "recover" }
  | { type: "quantity"; value: string }
  | { type: "chapter"; value: number }
  | { type: "accept" }
  | { type: "retry" }
  | { type: "reset" };
export function reduceRun(run: Run, action: Action): Run {
  // No editing or acceptance can race initialization or a failed setup.
  if (
    run.phase !== "ready" &&
    ["quantity", "chapter", "accept", "retry"].includes(action.type)
  )
    return run;
  switch (action.type) {
    case "initialized":
      return { ...run, phase: "ready" };
    case "initialization-failed":
      return { ...run, phase: "error" };
    case "recover":
      return { ...freshRun(), attempt: run.attempt + 1 };
    case "quantity":
      return run.event ? run : { ...run, quantity: action.value, error: "" };
    case "chapter":
      return { ...run, chapter: action.value };
    case "reset":
      return {
        ...freshRun(),
        attempt: run.attempt,
        phase: "ready",
        announcement:
          "Demo reset. Two baseline events restored. Quantity is editable.",
      };
    case "accept": {
      if (run.event) return run;
      const quantity = Number(run.quantity);
      if (!validDemoQuantity(run.quantity)) {
        return {
          ...run,
          error: "Enter a whole number from 1 to 10,000 for this demo.",
        };
      }
      const event = Object.freeze({
        id: "evt_demo_0125",
        idempotencyKey: "idem_demo_0125",
        customer: "Orbit Studio · orbit_studio",
        metric: "API_CALL",
        quantity,
        occurredAt: "2026-09-28T14:32:00.000Z",
        receivedAt: run.clock,
      });
      return {
        ...run,
        quantity: String(quantity),
        event,
        error: "",
        announcement:
          "Event evt_demo_0125 accepted. Awaiting processing; no contribution created.",
      };
    }
    case "retry":
      return run.event
        ? {
            ...run,
            retries: run.retries + 1,
            announcement: `Original event ${run.event.id} returned. Identical retry ${run.retries + 1}; no usage added.`,
          }
        : run;
  }
}
