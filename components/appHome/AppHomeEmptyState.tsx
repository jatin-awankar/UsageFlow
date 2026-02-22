import Link from "next/link";
import { Building2, Layers, Sparkles } from "lucide-react";
import { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export default function AppHomeEmptyState() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-white via-slate-50 to-sky-50/30 p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-700">
      <div className="pointer-events-none absolute -top-16 -right-8 h-48 w-48 rounded-full bg-sky-300/20 blur-3xl" />

      <div className="relative grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <span className="inline-flex rounded-lg bg-slate-100 p-2 text-slate-600">
            <Building2 className="size-5" />
          </span>
          <h2 className="mt-3 text-xl font-semibold text-slate-900">
            No organization yet
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Create your first workspace to configure metrics, plans, and usage
            tracking.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/onboarding/create-org">Create organization</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <HintCard
            icon={<Layers className="size-4 text-cyan-600" />}
            title="Start with structure"
            description="Set up metrics and plans once, then onboard your products quickly."
          />
          <HintCard
            icon={<Sparkles className="size-4 text-sky-600" />}
            title="Scale confidently"
            description="UsageFlow keeps billing and operational data in sync across teams."
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
