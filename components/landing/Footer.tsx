import { ExternalLink } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/80 px-4 py-20 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 py-10 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h3 className="text-base font-semibold tracking-tight text-slate-900">
            UsageFlow
          </h3>
          <p className="text-sm text-slate-600">Usage-based billing platform</p>
          <p className="text-sm text-slate-500">
            Built by{" "}
            <span className="inline-flex items-center gap-1 font-medium text-slate-900 hover:underline">
              <a href="https://jatinawankar.dev" target="_blank">
                Jatin Awankar
              </a>
              <ExternalLink size={12} />
            </span>
          </p>
          <p className="pt-3 text-xs text-slate-400">
            © {new Date().getFullYear()} UsageFlow
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 text-sm">
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
