// Fixed, synthetic source evidence. These are existing fixtures, never visitor results.
export const baselineEvents = [
  {
    id: "evt_demo_prior_01",
    quantity: 6000,
    occurred: "10 Sep 2026, 12:00 UTC",
    exactTime: "2026-09-10T12:00:00.000Z",
    display: "15.00",
    exact: "15.000",
  },
  {
    id: "evt_demo_prior_02",
    quantity: 4000,
    occurred: "20 Sep 2026, 12:00 UTC",
    exactTime: "2026-09-20T12:00:00.000Z",
    display: "10.00",
    exact: "10.000",
  },
] as const;
