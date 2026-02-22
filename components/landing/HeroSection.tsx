import Link from "next/link";
import { ArrowRight, CheckCircle2, Github, SendHorizontal } from "lucide-react";

import { Button } from "../ui/button";

const ingestionSnippet = `POST /api/track\nx-usageflow-api-key: uf_live_***\n\n{\n  \"metric\": \"API_CALL\",\n  \"amount\": 1000,\n  \"customerId\": \"user_123\"\n}`;

const webhookSnippet = `{\n  \"type\": \"invoice.created\",\n  \"data\": {\n    \"invoiceId\": \"inv_123\",\n    \"amount\": 1200\n  }\n}`;

export default function HeroSection() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6 animate-in fade-in slide-in-from-left-3 duration-700">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Usage-based billing and webhooks for serious SaaS teams
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Track events, meter usage, price accurately, generate invoices, and
            stream reliable webhooks without stitching together five systems.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/app">
                Open dashboard
                <ArrowRight className="size-4" />
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg">
              <Link
                href="https://github.com/jatin-awankar/UsageFlow"
                target="_blank"
              >
                <Github className="size-4" />
                View source
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <SendHorizontal className="size-3.5" />
              Event-driven architecture
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              Multi-tenant isolation
            </span>
          </div>
        </div>

        <div className="relative animate-in fade-in slide-in-from-right-3 duration-700 [animation-delay:120ms]">
          <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
              <span>Usage event ingestion</span>
              <span>POST</span>
            </div>
            <pre className="overflow-x-auto bg-slate-950 p-4 text-xs leading-relaxed text-slate-100 sm:text-sm">
              <code>{ingestionSnippet}</code>
            </pre>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-lg sm:absolute sm:-bottom-14 sm:-right-8 sm:mt-0 sm:w-[82%]">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
              <span>Webhook payload</span>
              <span>POST</span>
            </div>
            <pre className="overflow-x-auto bg-slate-900 p-4 text-xs leading-relaxed text-slate-100 sm:text-sm">
              <code>{webhookSnippet}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
