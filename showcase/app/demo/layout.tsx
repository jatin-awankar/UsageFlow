import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guided demo — UsageFlow",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
