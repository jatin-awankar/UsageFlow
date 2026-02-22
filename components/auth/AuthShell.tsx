import { ReactNode } from "react";

type AuthShellProps = {
  eyebrow?: string;
  title: string;
  description: string;
  footer?: ReactNode;
  children: ReactNode;
};

export default function AuthShell({
  eyebrow,
  title,
  description,
  footer,
  children,
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 py-10 sm:py-14">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-8 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl" />

      <div className="relative mx-auto w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-7">
          <div className="mb-6 space-y-2 text-center">
            <p className="text-sm font-semibold tracking-tight text-slate-900">UsageFlow</p>
            {eyebrow ? (
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500">{description}</p>
          </div>

          {children}

          {footer ? <div className="mt-6 text-center">{footer}</div> : null}
        </section>
      </div>
    </main>
  );
}
