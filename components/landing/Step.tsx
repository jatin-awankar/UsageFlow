export default function Step({
  number,
  title,
  desc,
  delay = 0,
}: {
  number: string;
  title: string;
  desc: string;
  delay?: number;
}) {
  return (
    <article
      className="rounded-xl border border-slate-200/80 bg-white/90 p-5 shadow-sm transition-transform duration-300 hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-2"
      style={{
        animationDuration: "620ms",
        animationDelay: `${delay}ms`,
      }}
    >
      <span className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600">
        {number}
      </span>

      <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
    </article>
  );
}
