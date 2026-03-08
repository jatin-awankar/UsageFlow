import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Github,
  SendHorizontal,
  ShieldCheck,
} from "lucide-react";

import { Button } from "../ui/button";

const ingestionSnippet = `POST /api/track\nx-usageflow-api-key: uf_live_***\n\n{\n  \"metric\": \"API_CALL\",\n  \"amount\": 1000,\n  \"customerId\": \"user_123\"\n}`;

const webhookSnippet = `{\n  \"type\": \"invoice.created\",\n  \"data\": {\n    \"invoiceId\": \"inv_123\",\n    \"amount\": 1200\n  }\n}`;

export default function HeroSection() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6 animate-in fade-in slide-in-from-left-3 duration-700">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-primary/80">
            Billing infrastructure for modern SaaS
          </p>

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

          <div className="grid gap-3 pt-1 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                Event latency
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                &lt; 200ms
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                Multi-tenant ready
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                Org scoped
              </p>
            </div>
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
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" />
              Signed ingestion keys
            </span>
          </div>
        </div>

        <div className="relative animate-in fade-in slide-in-from-right-3 duration-700 [animation-delay:120ms]">
          <div className="absolute -inset-5 -z-10 rounded-3xl bg-linear-to-br from-cyan-200/35 via-sky-200/20 to-indigo-200/35 blur-2xl" />

          <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-600">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
              <span>Usage event ingestion</span>
              <span>POST</span>
            </div>
            <pre className="overflow-x-auto bg-slate-950 p-4 text-xs leading-relaxed text-slate-100 sm:text-sm">
              <code>{ingestionSnippet}</code>
            </pre>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 sm:absolute sm:-bottom-14 sm:-right-8 sm:mt-0 sm:w-[82%]">
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
