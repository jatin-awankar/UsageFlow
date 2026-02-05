import Link from "next/link";
import { Button } from "../ui/button";

export default function HeroSection() {
  return (
    <div className="mx-auto max-w-5xl px-6">
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Usage-based billing & webhooks, built for modern SaaS
          </h1>
          <h2 className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Track usage, configure pricing, generate invoices, and deliver
            billing events — using a production-grade, developer-first platform.
          </h2>
          <div className="flex items-center gap-6">
            <Button asChild>
              <Link href="/app">Open Dashboard</Link>
            </Button>

            <Link
              href="https://github.com/jatin-awankar/UsageFlow"
              target="_blank"
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              View on GitHub
            </Link>
          </div>

          <p className="hidden md:block text-sm font-light text-muted-foreground leading-relaxed">
            Designed with real-world SaaS architecture patterns.
          </p>
        </div>
        <div className="relative w-full max-w-md">
          <div className="rounded-lg border bg-background shadow-primary shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2 border-b text-xs text-muted-foreground">
              <span>Usage event ingestion</span>
              <span>POST</span>
            </div>

            <pre className="bg-foreground text-background p-5 text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap wrap-break-word">
              <code>
                {`POST /api/track
    x-usageflow-api-key: uf_live_***

    {
    "metric": "API_CALL",
    "amount": 1000,
    "customerId": "user_123"
    }`}
              </code>
            </pre>
          </div>
          <div className="absolute hidden md:block -bottom-10 -right-16 rounded-lg border bg-background shadow-2xl shadow-primary">
            <div className="flex items-center justify-between px-4 py-2 border-b text-xs text-muted-foreground">
              <span>Webhook Payload</span>
              <span>POST</span>
            </div>

            <pre className="bg-foreground/95 text-background/90 p-5 text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap wrap-break-word">
              <code>
                {`{
    "type": "invoice.created",
    "data": {
        "invoiceId": "inv_123",
        "amount": 1200
    }
}`}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
