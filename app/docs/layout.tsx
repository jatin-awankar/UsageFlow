import Image from "next/image";
import Link from "next/link";
import DocsSidebar from "@/components/docs/DocsSidebar";
import TableOfContents from "@/components/docs/TableOfContents";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-slate-50">
      <div className="pointer-events-none absolute left-[-180px] top-[-120px] -z-10 h-[360px] w-[360px] rounded-full bg-cyan-300/25 blur-3xl" />
      <div className="pointer-events-none absolute right-[-220px] top-[180px] -z-10 h-[420px] w-[420px] rounded-full bg-indigo-300/20 blur-3xl" />

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-7">
            <Link href="/docs" className="flex items-center gap-2">
              <Image src="/icon.png" alt="UsageFlow" width={22} height={22} />
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                UsageFlow Docs
              </span>
            </Link>

            <div className="hidden items-center gap-5 md:flex">
              <Link
                href="/"
                className="text-sm text-slate-600 transition hover:text-slate-900"
              >
                Platform
              </Link>
              <Link
                href="/docs"
                className="text-sm text-slate-600 transition hover:text-slate-900"
              >
                Documentation
              </Link>
              <Link
                href="/docs/api/track"
                className="text-sm text-slate-600 transition hover:text-slate-900"
              >
                API Reference
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/register"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Get Started
            </Link>
            <Link
              href="/app"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Dashboard
            </Link>
          </div>
        </nav>
      </header>

      <div className="sticky top-16 z-40 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3">
          <details className="min-w-0 flex-1">
            <summary className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium marker:hidden">
              Navigation
            </summary>
            <div className="mt-3 max-h-[65vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5">
              <DocsSidebar />
            </div>
          </details>
          <details className="min-w-0 flex-1">
            <summary className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium marker:hidden">
              On this page
            </summary>
            <div className="mt-3 max-h-[65vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5">
              <TableOfContents />
            </div>
          </details>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="sticky top-22 hidden h-[calc(100vh-6rem)] shrink-0 lg:block">
          <div className="h-full w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
            <DocsSidebar />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <article className="docs-prose mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white px-5 py-8 shadow-xl shadow-slate-900/5 sm:px-8 lg:px-12 lg:py-12">
            {children}
          </article>
        </main>

        <aside className="sticky top-22 hidden h-[calc(100vh-6rem)] shrink-0 xl:block">
          <div className="h-full w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
            <TableOfContents />
          </div>
        </aside>
      </div>
    </div>
  );
}
