import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export default function PageHeader({
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-7 rounded-2xl border border-slate-200/80 bg-linear-to-br from-white via-slate-50/70 to-sky-50/40 px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Workspace module
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
        {description && (
            <p className="mt-1.5 max-w-3xl text-sm text-slate-600">{description}</p>
        )}
        </div>

        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
