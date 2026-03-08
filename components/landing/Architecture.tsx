import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

const points = [
  "Durable event storage for critical workflows",
  "Background workers with controlled retries",
  "Delivery logs and audit trails for visibility",
];

export default function Architecture() {
  return (
    <section className="mx-auto max-w-6xl">
      <div className="grid gap-8 rounded-3xl border border-slate-200/90 bg-white/90 p-6 shadow-xl shadow-slate-900/5 md:grid-cols-[1.15fr_0.85fr] md:items-center md:p-8">
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            Architecture and reliability
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Event-driven by design, built for operational safety
          </h2>
          <p className="text-base leading-relaxed text-slate-600">
            UsageFlow separates event creation from downstream side effects so
            billing-critical jobs can be retried and observed independently.
          </p>
          <p className="text-sm leading-relaxed text-slate-500">
            The system design mirrors practical SaaS patterns where correctness,
            durability, and external integrations matter as much as UI.
          </p>

          <ul className="space-y-2 pt-1">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-cyan-600" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="animate-in fade-in zoom-in-95 duration-700 [animation-delay:120ms]">
          <Image
            src="/architecture.png"
            alt="UsageFlow system architecture"
            width={420}
            height={340}
            className="mx-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-lg shadow-slate-900/5"
          />
        </div>
      </div>
    </section>
  );
}
