import {
  Activity,
  ClipboardList,
  Key,
  Layers,
  Sliders,
  Webhook,
} from "lucide-react";
import Feature from "./Feature";

export default function KeyFeatures() {
  return (
    <section className="mx-auto max-w-5xl px-6 space-y-8 text-center">
      <div className="space-y-3">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Key Features
        </h2>
        <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Designed to reflect real-world SaaS billing and event-driven systems.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 text-left">
        <Feature
          icon={<Layers />}
          title="Multi-tenant architecture"
          desc="Organizations are fully isolated with role-based access control and scoped data access."
        />

        <Feature
          icon={<Sliders />}
          title="Flexible pricing engine"
          desc="Define metrics, plans, and overage rules to model usage-based pricing accurately."
        />

        <Feature
          icon={<Key />}
          title="Secure usage ingestion"
          desc="Usage events are ingested via hashed API keys with strict validation and isolation."
        />

        <Feature
          icon={<Activity />}
          title="Background processing"
          desc="Usage aggregation, invoice generation, and webhook delivery run asynchronously via workers."
        />

        <Feature
          icon={<Webhook />}
          title="Reliable webhooks"
          desc="Business events are stored durably and delivered with retries and delivery logs."
        />

        <Feature
          icon={<ClipboardList />}
          title="Auditability & observability"
          desc="Sensitive actions and webhook deliveries are logged for traceability and debugging."
        />
      </div>
    </section>
  );
}
