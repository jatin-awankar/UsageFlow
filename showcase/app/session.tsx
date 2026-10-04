"use client";
import { createContext, useContext, useState } from "react";
const Session = createContext<{
  quantity: string;
  setQuantity: (value: string) => void;
} | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [quantity, setQuantity] = useState("1250");
  return (
    <Session.Provider value={{ quantity, setQuantity }}>
      {children}
    </Session.Provider>
  );
}
export function useSession() {
  const session = useContext(Session);
  if (!session) throw new Error("Showcase session is missing");
  return session;
}
