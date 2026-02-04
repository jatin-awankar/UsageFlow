import Step from "./Step";

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-5xl px-6 space-y-6">
      <h2 className="text-3xl md:text-4xl font-semibold">How It Works</h2>
      <p className="text-base text-muted-foreground">
        UsageFlow follows a clear, event-driven flow from usage tracking to
        billing and delivery.
      </p>
      <div className="flex flex-col md:flex-row gap-6">
        <Step
          number="01"
          title="Track usage"
          desc="Applications send usage events securely using API keys, recording metrics such as API calls or active users."
        />
        <Step
          number="02"
          title="Apply pricing rules"
          desc="Usage is aggregated in the background and priced according to configurable plans and metrics."
        />
        <Step
          number="03"
          title="Generate invoices"
          desc="Invoices are created automatically at the end of each billing period based on aggregated usage."
        />
        <Step
          number="04"
          title="Deliver events"
          desc="Important events such as invoice creation are emitted and delivered reliably to external systems via webhooks."
        />
      </div>
    </div>
  );
}
