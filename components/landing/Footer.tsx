import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h3 className="text-base font-semibold tracking-tight text-slate-900">
            UsageFlow
          </h3>
          <p className="text-sm text-slate-600">Usage-based billing platform</p>
          <p className="text-sm text-slate-500">
            Built by{" "}
            <span className="font-medium text-slate-900">Jatin Awankar</span>
          </p>
          <p className="pt-3 text-xs text-slate-400">
            © {new Date().getFullYear()} UsageFlow
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link
            href="https://github.com/jatin-awankar/UsageFlow"
            target="_blank"
            className="text-slate-500 transition hover:text-slate-900"
          >
            GitHub
          </Link>
          <Link
            href="https://www.linkedin.com/in/jatin-awankar"
            target="_blank"
            className="text-slate-500 transition hover:text-slate-900"
          >
            LinkedIn
          </Link>
          <Link
            href="/app"
            className="text-slate-500 transition hover:text-slate-900"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </footer>
  );
}
