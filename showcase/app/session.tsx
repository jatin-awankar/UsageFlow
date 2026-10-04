"use client";
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
} from "react";
import { createInitializer } from "./initialization";
import { freshRun, reduceRun, type Run, type Action } from "./run";
const Session = createContext<{
  run: Run;
  dispatch: React.Dispatch<Action>;
} | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [run, dispatch] = useReducer(reduceRun, undefined, freshRun);
  const initialize = useRef<ReturnType<typeof createInitializer> | null>(null);
  useEffect(() => {
    let active = true;
    initialize.current ??= createInitializer();
    initialize.current(run.attempt).then(
      () => {
        if (active) dispatch({ type: "initialized" });
      },
      () => {
        if (active) dispatch({ type: "initialization-failed" });
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
