# UsageFlow billing language

Terms for the pilot billing domain.

## Parties

**Organization**:
A SaaS business that integrates with UsageFlow and owns its billing data.

**User**:
A person who belongs to one or more Organizations, with a role in each. A User is not the billed party.

**Customer**:
An Organization's billed account, distinct from that Organization's Users. The same real-world party may be a separate Customer in another Organization.
_Avoid_: User, Organization

**External customer ID**:
The identifier an Organization assigns to one of its Customers in its own system. Its meaning is scoped to that Organization.

## Billing

**Subscription**:
The relationship that selects billing terms for a Customer over time. It is not an Organization membership.

**UsageEvent**:
An accepted, immutable record of a Customer's measured use of one metric at an occurrence time.

**PriceVersion**:
An immutable unit price and currency for a metric, effective from a specified time until the next version begins.

**BillingRecord**:
An Organization's calculation for one Customer and billing period, with traceable revisions. It is not a tax invoice or payment request.
_Avoid_: Invoice
