export const monthlyLimit = 100_000;
export const customerLimit = 20_000;
export const arrivalRate = 10;

export function admittedArrivalPlan({ sustainedSeconds = 1_800, burstSeconds = 10, diagnosticSeedCount } = {}) {
  if (!Number.isInteger(sustainedSeconds) || sustainedSeconds < 10 || sustainedSeconds > 1_800 || !Number.isInteger(burstSeconds) || burstSeconds < 1 || burstSeconds > 60) {
    throw new Error("Arrival durations are outside bounded limits");
  }
  if (diagnosticSeedCount !== undefined && (!Number.isInteger(diagnosticSeedCount) || diagnosticSeedCount < 1)) {
    throw new Error("Diagnostic seed count must be a positive integer");
  }
  const sustainedCount = arrivalRate * sustainedSeconds;
  const burstCount = arrivalRate * burstSeconds;
  const seedCount = diagnosticSeedCount ?? monthlyLimit - sustainedCount - burstCount;
  const count = seedCount + sustainedCount + burstCount;
  if (count > monthlyLimit) throw new Error("Arrival plan exceeds the monthly limit");
  return {
    seedCount, sustainedCount, burstCount, count, sustainedSeconds, burstSeconds,
    acceptanceEligible: diagnosticSeedCount === undefined && sustainedSeconds === 1_800 && burstSeconds === 10 && count === monthlyLimit,
  };
}

export function arrivalCustomerSlot(index) {
  if (!Number.isInteger(index) || index < 0 || index >= monthlyLimit) throw new Error("Event index is outside the pilot month");
  return Math.floor(index / customerLimit);
}
