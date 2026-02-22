import Link from "next/link";
import { ArrowRight, BarChart3, LayoutDashboard, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

function compactId(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function OrganizationGrid({
  organizations,
}: {
  organizations: {
    id: string;
    name: string;
  }[];
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Your organizations</h2>
          <p className="text-sm text-slate-500">
            Open a workspace or jump to analytics directly.
          </p>
        </div>

        <Button asChild size="sm">
          <Link href="/onboarding/create-org">
            <Plus className="size-4" />
            New organization
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {organizations.map((org, index) => (
          <article
            key={org.id}
            className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2"
            style={{
              animationDuration: "650ms",
              animationDelay: `${index * 60}ms`,
            }}
          >
            <p className="truncate text-sm font-semibold text-slate-900">{org.name}</p>
            <p className="mt-1 font-mono text-xs text-slate-500">{compactId(org.id)}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button asChild size="sm">
                <Link href={`/app/${org.id}/dashboard`}>
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Link>
              </Button>

              <Button asChild variant="outline" size="sm">
                <Link href={`/app/${org.id}/analytics`}>
                  <BarChart3 className="size-4" />
                  Analytics
                </Link>
              </Button>
            </div>

            <Link
              href={`/app/${org.id}/dashboard`}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-900"
            >
              Continue workspace
              <ArrowRight className="size-3.5" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
