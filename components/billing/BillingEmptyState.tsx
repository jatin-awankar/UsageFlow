import Link from "next/link";
import { CreditCard, Sparkles, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

export default function BillingEmptyState({ orgId }: { orgId: string }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-white via-slate-50 to-sky-50/30 p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-700">
      <div className="pointer-events-none absolute -top-16 -right-8 h-48 w-48 rounded-full bg-sky-300/20 blur-3xl" />

      <div className="relative grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <span className="inline-flex rounded-lg bg-slate-100 p-2 text-slate-600">
            <CreditCard className="size-5" />
          </span>
          <h2 className="mt-3 text-xl font-semibold text-slate-900">
            No active subscription
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Activate a plan to start tracking spend, overages, and invoice
            projections for this organization.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href={`/app/${orgId}/plans`}>Get subscription</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/app/${orgId}/dashboard`}>Back to dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <HintCard
            icon={<WalletCards className="size-4 text-cyan-600" />}
            title="Track cost drivers"
            description="See which metrics contribute most to overage cost."
          />
          <HintCard
            icon={<Sparkles className="size-4 text-sky-600" />}
            title="Generate invoices"
            description="Owners and admins can queue invoice generation anytime."
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
