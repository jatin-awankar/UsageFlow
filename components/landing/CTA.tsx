import Link from "next/link";
import { Button } from "../ui/button";
import { Github } from "lucide-react";

export default function CTA() {
  return (
    <section className="mx-auto max-w-5xl px-6">
      <div className="rounded-2xl bg-muted/40 py-16 text-center space-y-6">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Explore UsageFlow in action
        </h2>

        <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
          View the dashboard or explore the source code to understand how
          UsageFlow is built.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/app">View Dashboard</Link>
          </Button>

          <Button
            size="lg"
            asChild
            variant="outline"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Link
              href="https://github.com/jatin-awankar/UsageFlow"
              target="_blank"
            >
              <span className="inline-flex items-center gap-2 text-sm">
                <Github className="h-4 w-4" />
                View on GitHub
              </span>
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
