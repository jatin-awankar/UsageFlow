export default function WhatIsUF() {
  return (
    <div className="mx-auto max-w-3xl px-6 text-center space-y-6">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
        What is UsageFlow?
      </h1>
      <p className="text-base md:text-lg text-foreground leading-relaxed">
        UsageFlow is a multi-tenant SaaS platform that enables applications to
        track usage, apply pricing rules, generate invoices, and notify external
        systems through reliable webhooks.
      </p>
      <p className="text-base text-muted-foreground leading-relaxed">
        It is designed to model real-world billing systems, focusing on
        event-driven architecture, background processing, and observability
        rather than simple UI workflows.
      </p>
    </div>
  );
}
