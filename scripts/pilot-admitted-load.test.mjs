import assert from "node:assert/strict";
import { test } from "node:test";
import { admittedArrivalPlan, arrivalCustomerSlot } from "./pilot-admitted-load.mjs";

test("approved arrival plan reaches exactly 100,000 events without exceeding 20,000 per Customer", () => {
  const plan = admittedArrivalPlan();
  assert.deepEqual([plan.seedCount, plan.sustainedCount, plan.burstCount, plan.count], [81_900, 18_000, 100, 100_000]);
  assert.equal(plan.acceptanceEligible, true);
  for (let slot = 0; slot < 5; slot++) {
    assert.equal(arrivalCustomerSlot(slot * 20_000), slot);
    assert.equal(arrivalCustomerSlot((slot + 1) * 20_000 - 1), slot);
  }
});

test("shortened and diagnostic runs cannot claim acceptance", () => {
  assert.equal(admittedArrivalPlan({ sustainedSeconds: 60 }).acceptanceEligible, false);
  assert.equal(admittedArrivalPlan({ sustainedSeconds: 10, diagnosticSeedCount: 20 }).acceptanceEligible, false);
  assert.throws(() => admittedArrivalPlan({ sustainedSeconds: 1_801 }));
  assert.throws(() => admittedArrivalPlan({ diagnosticSeedCount: 90_000 }));
  assert.throws(() => arrivalCustomerSlot(100_000));
});
