export type BillingEndpointOutcome = "PENDING" | "DELIVERED" | "FAILED" | "DISABLED";

export function billingEndpointOutcome(work: { terminal: boolean; completedAt: Date | null }): BillingEndpointOutcome {
  if (work.terminal) return work.completedAt ? "DISABLED" : "FAILED";
  return work.completedAt ? "DELIVERED" : "PENDING";
}
