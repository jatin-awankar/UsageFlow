import Link from "next/link";
import { ReactNode } from "react";
import { Sparkles, Shield, Workflow } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AuditLogsEmptyState({ orgId }: { orgId: string }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-white via-slate-50 to-sky-50/30 p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-700">
      <div className="pointer-events-none absolute -top-16 -right-8 h-48 w-48 rounded-full bg-sky-300/20 blur-3xl" />

      <div className="relative grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <span className="inline-flex rounded-lg bg-slate-100 p-2 text-slate-600">
            <Shield className="size-5" />
          </span>
          <h2 className="mt-3 text-xl font-semibold text-slate-900">
            No audit activity yet
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Actions like key rotation, plan updates, and billing state changes
            will appear here automatically.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/app/${orgId}/dashboard`}>Open dashboard</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/app/${orgId}/settings`}>Organization settings</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <HintCard
            icon={<Workflow className="size-4 text-cyan-600" />}
            title="Track critical changes"
            description="Use audit logs to review operational changes in shared environments."
          />
          <HintCard
            icon={<Sparkles className="size-4 text-sky-600" />}
            title="Build reliable workflows"
            description="Structured logs make debugging, incident reviews, and compliance easier."
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
    <article className="rounded-xl border border-slate-200/70 bg-white/85 p-3 shadow-sm">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
        {icon}
        {title}
      </p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </article>
  );
}
