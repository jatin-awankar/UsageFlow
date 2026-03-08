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
      className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-md shadow-slate-900/5 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10 animate-in fade-in slide-in-from-bottom-2"
      style={{
        animationDuration: "620ms",
        animationDelay: `${delay}ms`,
      }}
    >
      <span className="inline-flex rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-mono text-sky-700">
        {number}
      </span>

      <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
    </article>
  );
}
