"use client";
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
} from "react";
import {
  createInitializer,
  createRatingAction,
  createFinalizationAction,
} from "./initialization";
import { monthlyDraft } from "./monthly";
import { freshRun, reduceRun, type Run, type Action } from "./run";
const Session = createContext<{
  run: Run;
  dispatch: React.Dispatch<Action>;
} | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [run, send] = useReducer(reduceRun, undefined, freshRun);
  const initialize = useRef<ReturnType<typeof createInitializer> | null>(null);
  const ratingAction = useRef<ReturnType<typeof createRatingAction> | null>(
    null,
  );
  const finalizationAction = useRef<ReturnType<
    typeof createFinalizationAction
  > | null>(null);
  function dispatch(action: Action) {
    if (
      action.type === "finalize" &&
      !run.finalization &&
      monthlyDraft(run).state === "READY_FOR_REVIEW"
    ) {
      finalizationAction.current ??= createFinalizationAction();
      send({ ...action, failBeforeEvent: !finalizationAction.current() });
      return;
    }
    if (action.type === "rate" && run.event && !run.rating) {
      ratingAction.current ??= createRatingAction();
      if (!ratingAction.current()) {
        send({ type: "rating-action-failed" });
        return;
      }
    }
    send(action);
  }
  useEffect(() => {
    let active = true;
    initialize.current ??= createInitializer();
    initialize.current(run.attempt).then(
      (seed) => {
        if (active) send({ type: "initialized", seed });
      },
      () => {
        if (active) send({ type: "initialization-failed" });
      },
    );
    return () => {
      active = false;
    };
  }, [run.attempt]);
  return (
    <Session.Provider value={{ run, dispatch }}>{children}</Session.Provider>
  );
}
export function useSession() {
  const session = useContext(Session);
  if (!session) throw new Error("Showcase session is missing");
  return session;
}
