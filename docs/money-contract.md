# Customer pricing money contract

This contract applies to future PriceVersions and ratings. Ticket 01 creates no prices or ratings.

- Each Organization explicitly selects one uppercase ISO 4217 currency. A published PriceVersion locks that Organization's currency; changing it requires a separate migration or design, never an in-place update. The publication lock is enforced when PriceVersion creation is implemented in ticket 02.
- Unit price is nonnegative decimal with at most six integer and six fractional digits (maximum `999999.999999`). No exponent, sign, leading zero, or binary float input is accepted. Store its integer micro-units exactly.
- Quantity is a positive integer from 1 through 1,000,000,000, matching accepted pilot events. Multiply unit micro-units by quantity using arbitrary-precision integer arithmetic. Fractional quantities are unsupported.
- Round **once, after multiplication**, to the ISO 4217 currency's minor-unit scale using half-up rounding. The exact extended amount is at most 999,999,999,999,999 minor units. Reject larger results; do not truncate or saturate. Zero-decimal currencies such as JPY round to whole units; three-decimal currencies retain three places.
- The accepted codes and minor-unit scales are pinned in `lib/currency-scales.ts`; deployments do not derive them from host ICU. Changes to that table require a reviewed contract revision.
- Return and persist money as decimal strings or exact integers. Never use a JavaScript `number` for a monetary value. This ticket's `rateMoney` function pins the future rating arithmetic; no price acceptance path is enabled yet.

Migration is additive and leaves `Organization.currency` null for existing rows. Existing Plan, aggregate, and Invoice amounts stay untouched. A rollback must first export recorded `(Organization.id, currency)` decisions, then drop the new column only if deliberately abandoning them; reapply the migration and restore the exported decisions to recover. The Customer-linked ingestion gate remains off.
