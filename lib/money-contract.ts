import { CURRENCY_SCALES } from "./currency-scales.ts";

export function isSupportedCurrency(value: string): boolean {
  return /^[A-Z]{3}$/.test(value) && Object.hasOwn(CURRENCY_SCALES, value);
}

const MAX_UNIT_MICROS = 999_999_999_999n;
const MAX_QUANTITY = 1_000_000_000n;
const MAX_MINOR_UNITS = 999_999_999_999_999n;

export function rateMoney(unitPrice: string, quantity: bigint, currency: string): string {
  if (!isSupportedCurrency(currency)) throw new RangeError("Invalid currency");
  if (!/^(0|[1-9]\d{0,5})(\.\d{1,6})?$/.test(unitPrice)) throw new RangeError("Invalid unit price");
  if (quantity < 1n || quantity > MAX_QUANTITY) throw new RangeError("Invalid quantity");
  const [whole, fraction = ""] = unitPrice.split(".");
  const micros = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0") || "0");
  if (micros > MAX_UNIT_MICROS) throw new RangeError("Invalid unit price");
  const digits = CURRENCY_SCALES[currency];
  const divisor = 10n ** BigInt(6 - digits);
  const minor = (micros * quantity + divisor / 2n) / divisor;
  if (minor > MAX_MINOR_UNITS) throw new RangeError("Extended amount exceeds limit");
  const scale = 10n ** BigInt(digits);
  return digits === 0 ? minor.toString() : `${minor / scale}.${(minor % scale).toString().padStart(digits, "0")}`;
}
