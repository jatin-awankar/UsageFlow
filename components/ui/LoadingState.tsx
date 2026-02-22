export default function LoadingState({
  label = "Loading...",
  description = "Preparing your workspace",
}: {
  label?: string;
  description?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-white via-slate-50 to-sky-50/30 p-6 shadow-sm animate-in fade-in duration-500">
      <div className="pointer-events-none absolute -top-16 right-0 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="relative">
        <div className="mb-5 flex items-center gap-3">
          <div className="size-8 rounded-full border-2 border-slate-300 border-t-sky-500 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-slate-900">{label}</p>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>

        <div className="mb-4 h-52 rounded-xl bg-slate-200/70 animate-pulse [animation-delay:320ms]" />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-20 rounded-xl bg-slate-200/85 animate-pulse" />
          <div className="h-20 rounded-xl bg-slate-200/80 animate-pulse [animation-delay:120ms]" />
          <div className="h-20 rounded-xl bg-slate-200/75 animate-pulse [animation-delay:220ms]" />
        </div>
      </div>
    </section>
  );
}
