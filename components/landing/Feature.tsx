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
      className="rounded-xl border border-slate-200/80 bg-white/90 p-5 shadow-sm transition-transform duration-300 hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-2"
      style={{
        animationDuration: "620ms",
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex rounded-md bg-slate-100 p-2 text-slate-600">
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
