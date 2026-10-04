import { rateMoney } from "../../lib/money-contract";
import type { AcceptedEvent } from "./run";

export type PriceVersion = Readonly<{
  id: string;
  effectiveFrom: string;
  unitPrice: string;
}>;
export const septemberPrice: PriceVersion = {
  id: "pv_api_sep_01",
  effectiveFrom: "2026-09-01T00:00:00.000Z",
  unitPrice: "0.0025",
};
export type Rating = Readonly<{
  eventId: string;
  price: PriceVersion;
  product: string;
  display: string;
  exact: string;
}>;
export function rateEvent(
  event: AcceptedEvent,
  prices: readonly PriceVersion[],
): Rating {
  const price = prices
    .filter((p) => p.effectiveFrom <= event.occurredAt)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  if (!price) throw new Error("No applicable price");
  const [whole, fraction = ""] = price.unitPrice.split(".");
  const productUnits =
    BigInt(whole + fraction.padEnd(6, "0")) * BigInt(event.quantity);
  const product =
    `${productUnits / 1_000_000n}.${String(productUnits % 1_000_000n).padStart(6, "0")}`
      .replace(/0+$/, "")
      .replace(/\.$/, "");
  const display = rateMoney(price.unitPrice, BigInt(event.quantity), "INR");
  // INR has two minor-unit places. Padding is representation only, never rounding.
  return Object.freeze({
    eventId: event.id,
    price,
    product,
    display,
    exact: `${display}0`,
  });
}
export function contributionTotal(amounts: readonly string[]) {
  const units = amounts.reduce(
    (sum, value) => sum + BigInt(value.replace(".", "")),
    0n,
  );
  const exact = `${units / 1000n}.${String(units % 1000n).padStart(3, "0")}`;
  return { exact, display: exact.slice(0, -1) };
}
