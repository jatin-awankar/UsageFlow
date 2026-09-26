import { test } from "node:test";
import { strict as assert } from "node:assert";
import { isSupportedCurrency, rateMoney } from "../lib/money-contract.ts";

test("currency accepts ISO codes and rejects arbitrary or malformed identifiers", () => {
  assert.equal(isSupportedCurrency("USD"), true);
  assert.equal(isSupportedCurrency("JPY"), true);
  for (const value of ["usd", "US", "ZZZ", "XXX", "USD "]) assert.equal(isSupportedCurrency(value), false);
});

test("exact multiplication rounds once after extension, half up at currency minor unit", () => {
  assert.equal(rateMoney("0.000001", 5000n, "USD"), "0.01");
  assert.equal(rateMoney("0.000001", 4999n, "USD"), "0.00");
  assert.equal(rateMoney("0.5", 1n, "JPY"), "1");
  assert.equal(rateMoney("0.0005", 1n, "KWD"), "0.001");
  assert.equal(rateMoney("0.000499", 1n, "KWD"), "0.000");
  assert.equal(rateMoney("0.000001", 1_000_000_000n, "USD"), "1000.00");
  assert.equal(rateMoney("0", 1n, "USD"), "0.00");
});

test("declared unit, quantity, and extended amount boundaries", () => {
  assert.equal(rateMoney("999999.999999", 1n, "USD"), "1000000.00");
  assert.equal(rateMoney("999999.999999", 10_000_000n, "USD"), "9999999999990.00");
  assert.throws(() => rateMoney("999999.999999", 10_000_001n, "USD"), RangeError);
  for (const price of ["-1", "1.0000001", "1000000", "1e3", "01"]) assert.throws(() => rateMoney(price, 1n, "USD"), RangeError);
  assert.throws(() => rateMoney("1", -1n, "USD"), RangeError);
  assert.throws(() => rateMoney("1", 0n, "USD"), RangeError);
  assert.throws(() => rateMoney("1", 1_000_000_001n, "USD"), RangeError);
  assert.throws(() => rateMoney("999999.999999", 1_000_000_000n, "USD"), RangeError);
});
