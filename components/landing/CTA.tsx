import Link from "next/link";
import { ArrowRight, File } from "lucide-react";

import { Button } from "../ui/button";

export default function CTA() {
  return (
    <section className="mx-auto max-w-6xl">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-slate-900 via-slate-800 to-sky-900 p-8 text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="relative space-y-4 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Explore UsageFlow in action
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-200">
            Open the dashboard to experience the full workflow, or inspect the
            source to understand implementation details.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-100"
            >
              <Link href="/app">
                Open dashboard
                <ArrowRight className="size-4" />
              </Link>
            </Button>

            <Button
              size="lg"
              asChild
              variant="outline"
              className="border-slate-400/70 bg-transparent text-slate-100 hover:bg-slate-400"
            >
              <Link href="/docs">
                <File />
                View Docs
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
