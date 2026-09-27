import { Prisma } from "@prisma/client";

// RatedEvent.amount is stored as Decimal(18, 3). This is the storage scale,
// not the currency's rounding scale; rating has already rounded once.
const STORED_SCALE = 3;
const STORED_FACTOR = 10n ** BigInt(STORED_SCALE);
const STORED_AMOUNT_PATTERN = new RegExp(`^(\\d+)\\.(\\d{${STORED_SCALE}})$`);

export function persistedRatedAmount(amount: Prisma.Decimal): string {
  return amount.toFixed(STORED_SCALE);
}

export function sumPersistedRatedAmounts(amounts: readonly string[]): string {
  const total = amounts.reduce((sum, amount) => {
    const parts = STORED_AMOUNT_PATTERN.exec(amount);
    if (!parts) throw new RangeError("Invalid persisted rated amount");
    const [, whole, fraction] = parts;
    return sum + BigInt(whole) * STORED_FACTOR + BigInt(fraction);
  }, 0n);
  return `${total / STORED_FACTOR}.${(total % STORED_FACTOR).toString().padStart(STORED_SCALE, "0")}`;
}
