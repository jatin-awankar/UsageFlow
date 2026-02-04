import Image from "next/image";

export default function Architecture() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <h2 className="text-3xl md:text-4xl font-semibold mb-10">
        Architecture & Reliability
      </h2>

      <div className="flex flex-col md:flex-row gap-12 items-center">
        {/* Text */}
        <div className="max-w-xl space-y-5">
          <p className="text-base">
            UsageFlow is built using an event-driven architecture designed for
            correctness and reliability. Business events such as usage
            aggregation, invoice generation, and webhook delivery are persisted
            and processed asynchronously using background workers.
          </p>

          <p className="text-muted-foreground">
            Instead of coupling user actions directly to side effects, UsageFlow
            separates event creation from event processing, ensuring durability,
            observability, and safe retries.
          </p>

          <p className="text-sm text-muted-foreground">
            This approach mirrors patterns used in production SaaS platforms
            handling billing and external integrations.
          </p>

          <ul className="pt-4 space-y-2 text-sm">
            <li>• Durable event storage</li>
            <li>• Background workers with retries</li>
            <li>• Delivery logs & audit trails</li>
          </ul>
        </div>

        {/* Diagram */}
        <div className="shrink-0">
          <Image
            src="/architecture.png"
            alt="UsageFlow system architecture"
            width={320}
            height={300}
            className="opacity-90"
          />
        </div>
      </div>
    </section>
  );
}
