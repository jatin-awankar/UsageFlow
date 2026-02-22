import {
  Activity,
  ClipboardList,
  Key,
  Layers,
  Sliders,
  Webhook,
} from "lucide-react";

import Feature from "./Feature";

const features = [
  {
    icon: <Layers className="size-4" />,
    title: "Multi-tenant isolation",
    desc: "Organization-scoped data and role-based access controls across every workflow.",
  },
  {
    icon: <Sliders className="size-4" />,
    title: "Flexible pricing engine",
    desc: "Define metrics, plans, and overage rules to model real usage-based pricing.",
  },
  {
    icon: <Key className="size-4" />,
    title: "Secure ingestion",
    desc: "Usage events are authenticated with API keys and validated before processing.",
  },
  {
    icon: <Activity className="size-4" />,
    title: "Background processing",
    desc: "Aggregation, invoicing, and delivery workflows run reliably in workers.",
  },
  {
    icon: <Webhook className="size-4" />,
    title: "Reliable webhooks",
    desc: "Event retries, endpoint controls, and delivery logs keep integrations dependable.",
  },
  {
    icon: <ClipboardList className="size-4" />,
    title: "Audit visibility",
    desc: "Critical actions and delivery outcomes are recorded for operational traceability.",
  },
];

export default function KeyFeatures() {
  return (
    <section className="mx-auto max-w-6xl space-y-8">
      <div className="max-w-2xl space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
          Key features
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Built to mirror production SaaS billing systems
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature, index) => (
          <Feature
            key={feature.title}
            icon={feature.icon}
            title={feature.title}
            desc={feature.desc}
            delay={index * 55}
          />
        ))}
      </div>
    </section>
  );
}
