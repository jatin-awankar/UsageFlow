import { ReactNode } from "react";

export default function Feature({
  icon,
  title,
  desc,
  delay = 0,
}: {
  icon: ReactNode;
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
      <div className="flex items-start gap-3">
        <span className="inline-flex rounded-lg bg-sky-50 p-2 text-sky-700 ring-1 ring-sky-200">
          {icon}
        </span>
        <div>
          <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{desc}</p>
        </div>
      </div>
    </article>
  );
}
