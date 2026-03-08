export default function WhatIsUF() {
  return (
    <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200/90 bg-white/90 p-8 text-center shadow-xl shadow-slate-900/5 animate-in fade-in slide-in-from-bottom-2 duration-700 sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
        What is UsageFlow
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        A billing and event platform designed for real workloads
      </h2>
      <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-slate-700 sm:text-lg">
        UsageFlow helps product teams meter consumption, apply pricing rules,
        generate invoices, and notify downstream systems using reliable webhook
        delivery.
      </p>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">
        It is built around operational correctness: async processing,
        observability, retries, and auditable state transitions.
      </p>
    </div>
  );
}
