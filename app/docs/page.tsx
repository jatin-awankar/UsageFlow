import Link from "next/link";
import { docsNav } from "@/components/docs/docs-nav";

export default function DocsHome() {
  return (
    <div>
      <h1>UsageFlow Documentation</h1>
      <p>
        Build usage-based billing with a reliable API, event pipeline, and
        webhook delivery system.
      </p>

      <div className="mt-10 space-y-10">
        {docsNav.map((section) => (
          <section key={section.title}>
            <h2 className="mt-0! border-none pt-0 text-lg">{section.title}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl border border-border/70 bg-card px-4 py-3 no-underline transition-colors hover:bg-muted/50 shadow-md"
                >
                  <div className="text-sm font-semibold text-foreground">
                    {link.title}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {link.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
