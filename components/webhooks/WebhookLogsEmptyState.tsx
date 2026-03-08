import Link from "next/link";
import { ScrollText, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

export default function WebhookLogsEmptyState({ orgId }: { orgId: string }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-slate-900 via-slate-800 to-sky-900 p-6 text-white shadow-lg shadow-slate-900/15 animate-in fade-in slide-in-from-top-2 duration-700">
      <div className="pointer-events-none absolute -top-16 -right-8 h-48 w-48 rounded-full bg-sky-300/20 blur-3xl" />

      <div className="relative grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <span className="inline-flex rounded-lg bg-white/15 p-2 text-white">
            <ScrollText className="size-5" />
          </span>
          <h2 className="mt-3 text-xl font-semibold text-white">
            No webhook deliveries yet
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-200">
            Delivery attempts appear here when events are dispatched to your
            configured endpoints.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button asChild className="bg-white text-slate-900 hover:bg-slate-100">
              <Link href={`/app/${orgId}/webhooks`}>Manage endpoints</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              <Link href={`/app/${orgId}/dashboard`}>Back to dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <HintCard
            icon={<Send className="size-4 text-cyan-600" />}
            title="Trigger test events"
            description="Generate invoices or subscription events to validate delivery flow."
          />
          <HintCard
            icon={<Sparkles className="size-4 text-sky-600" />}
            title="Check endpoint responses"
            description="2xx responses are required to mark webhook attempts as successful."
          />
        </div>
      </div>
    </section>
  );
}

function HintCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-xl border border-white/15 bg-white/10 p-3 shadow-sm">
      <p className="flex items-center gap-2 text-sm font-medium text-white">
        {icon}
        {title}
      </p>
      <p className="mt-1 text-xs text-slate-300">{description}</p>
    </article>
  );
}
