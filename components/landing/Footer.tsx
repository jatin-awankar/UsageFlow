import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          {/* Left: Brand & Ownership */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold">UsageFlow</h3>

            <p className="text-sm text-muted-foreground">
              Usage-based billing platform
            </p>

            <p className="text-sm text-muted-foreground">
              Built by{" "}
              <span className="font-medium text-foreground">Jatin Awankar</span>
            </p>
          </div>

          {/* Right: Links */}
          <div className="flex flex-col gap-2 text-sm md:items-end">
            <Link
              href="https://github.com/jatin-awankar/UsageFlow"
              target="_blank"
              className="text-muted-foreground hover:text-foreground transition"
            >
              GitHub
            </Link>

            <Link
              href="https://www.linkedin.com/in/jatin-awankar"
              target="_blank"
              className="text-muted-foreground hover:text-foreground transition"
            >
              LinkedIn
            </Link>

            <Link
              href="/app"
              className="text-muted-foreground hover:text-foreground transition"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Bottom line */}
        <div className="mt-10 text-xs text-muted-foreground">
          © {new Date().getFullYear()} UsageFlow
        </div>
      </div>
    </footer>
  );
}
