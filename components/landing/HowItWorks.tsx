import Step from "./Step";

const steps = [
  {
    number: "01",
    title: "Ingest usage",
    desc: "Applications send signed usage events with API keys and structured metadata.",
  },
  {
    number: "02",
    title: "Price and aggregate",
    desc: "Background jobs aggregate usage and apply plan-level pricing and overage rules.",
  },
  {
    number: "03",
    title: "Generate invoices",
    desc: "Billing cycles close into invoices with transparent line-item calculations.",
  },
  {
    number: "04",
    title: "Deliver webhooks",
    desc: "Events are persisted and delivered to external endpoints with retries and logs.",
  },
];

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="max-w-2xl space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
          How it works
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          From event ingestion to external delivery
        </h2>
        <p className="text-base leading-relaxed text-slate-600">
          UsageFlow follows a predictable, event-driven lifecycle built for
          reliable billing operations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((step, index) => (
          <Step
            key={step.number}
            number={step.number}
            title={step.title}
            desc={step.desc}
            delay={index * 70}
          />
        ))}
      </div>
    </div>
  );
}
