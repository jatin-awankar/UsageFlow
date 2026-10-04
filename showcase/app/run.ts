import { pilotContact } from "./contact";
import { freezeFinalization, type Finalization } from "./finalization";
import { afterClose, monthlyDraft } from "./monthly";
import { baselineEvents, type BaselineSource } from "./demo/baseline";
import {
  rateEvent,
  septemberPrice,
  type Rating,
  type PriceVersion,
} from "./pricing";
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
  processed: boolean;
  rating: Rating | null;
  ratingError: string;
  finalization: Finalization | null;
  finalizationError: string;
  deliveryTarget: Readonly<{ id: string; url: string }> | null;
  deliveryAttempt: Readonly<{
    id: string;
    eventId: string;
    endpointId: string;
    attemptedAt: string;
    status: "DELIVERED";
    responseCode: 200;
  }> | null;
  contactDestination: string | null;
  prices: readonly PriceVersion[];
  baseline: readonly BaselineSource[];
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
    processed: false,
    rating: null,
    ratingError: "",
    finalization: null,
    finalizationError: "",
    deliveryTarget: Object.freeze({
      id: "endpoint_demo_orbit",
      url: "https://receiver.example.invalid/usageflow",
    }),
    deliveryAttempt: null,
    contactDestination: pilotContact,
    prices: [septemberPrice],
    baseline: baselineEvents,
    error: "",
    announcement: "",
  };
}
export type Action =
  | { type: "initialized"; seed?: Run }
  | { type: "initialization-failed" }
  | { type: "recover" }
  | { type: "quantity"; value: string }
  | { type: "chapter"; value: number }
  | { type: "accept" }
  | { type: "retry" }
  | { type: "rate" }
  | { type: "advance-time" }
  | { type: "rating-action-failed" }
  | { type: "finalize"; failBeforeEvent?: boolean }
  | { type: "deliver" }
  | { type: "reset" };
const ratingActionError =
  "The local rating action could not finish. Prior evidence is unchanged. Try again or reset the demo.";
export function reduceRun(run: Run, action: Action): Run {
  // No editing or acceptance can race initialization or a failed setup.
  if (
    run.phase !== "ready" &&
    [
      "quantity",
      "chapter",
      "accept",
      "retry",
      "rate",
      "advance-time",
      "finalize",
      "deliver",
      "rating-action-failed",
    ].includes(action.type)
  )
    return run;
  switch (action.type) {
    case "initialized":
      return { ...(action.seed ?? run), phase: "ready" };
    case "initialization-failed":
      return { ...run, phase: "error" };
    case "recover":
      return { ...freshRun(), attempt: run.attempt + 1 };
    case "quantity":
      return run.event || run.finalization
        ? run
        : { ...run, quantity: action.value, error: "" };
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
      if (run.event || run.finalization) return run;
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
    case "rating-action-failed":
      return { ...run, ratingError: ratingActionError };
    case "rate": {
      if (!run.event || run.rating || run.finalization) return run;
      try {
        const rating = rateEvent(run.event, run.prices);
        return {
          ...run,
          processed: true,
          rating,
          ratingError: "",
          announcement: `Event ${run.event.id} processed and rated. Contribution INR ${rating.display}.`,
        };
      } catch {
        return { ...run, ratingError: ratingActionError };
      }
    }
    case "advance-time": {
      if (run.clock >= afterClose) return run;
      const advanced = { ...run, clock: afterClose };
      return {
        ...advanced,
        announcement: `Scenario time advanced from ${run.clock} to ${afterClose}. Draft ${monthlyDraft(advanced).state}. Time advancement does not approve or resolve usage.`,
      };
    }
    case "finalize": {
      if (run.finalization) return run;
      if (monthlyDraft(run).state !== "READY_FOR_REVIEW")
        return {
          ...run,
          announcement:
            "Finalization blocked. Review the close and unresolved evidence; no version or event was created.",
        };
      try {
        const finalization = freezeFinalization(run, action.failBeforeEvent);
        return {
          ...run,
          finalization,
          finalizationError: "",
          announcement:
            "Simulated owner approval complete. BillingRecord version 1 finalized; one pending invoice.finalized event created. No delivery attempt, payment or tax invoice.",
        };
      } catch {
        return {
          ...run,
          finalizationError:
            "Local finalization could not finish. No version or event was created. Draft evidence is unchanged. Try finalization again or reset the demo.",
        };
      }
    }
    case "deliver": {
      if (!run.finalization || !run.deliveryTarget || run.deliveryAttempt)
        return run;
      return {
        ...run,
        deliveryAttempt: Object.freeze({
          id: "attempt_demo_1",
          eventId: run.finalization.event.id,
          endpointId: run.deliveryTarget.id,
          attemptedAt: run.clock,
          status: "DELIVERED",
          responseCode: 200,
        }),
        announcement:
          "Simulated delivery succeeded. One successful attempt recorded. No receiver request was sent.",
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
