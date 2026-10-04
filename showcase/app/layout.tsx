import type { Metadata } from "next";
import Link from "next/link";
import { SessionProvider } from "./session";
import "./style.css";
export const metadata: Metadata = {
  title: "UsageFlow — Every number has a story",
  description:
    "Explore an explainable usage billing calculation with synthetic data, locally in your browser.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <div className="paper">
            <a className="skip-link" href="#main">
              Skip to content
            </a>
            <header className="masthead">
              <Link className="wordmark" href="/" aria-label="UsageFlow home">
                UsageFlow<span>.</span>
              </Link>
              <nav aria-label="Main navigation">
                <Link href="/">Landing</Link>
                <Link href="/demo/">Demo workspace</Link>
                <Link href="/evidence/">How it works &amp; evidence</Link>
              </nav>
            </header>
            <div className="simulation-band">
              <span>Synthetic data · Local simulation</span>
              <span>No signup. No live billing.</span>
            </div>
            <main id="main" tabIndex={-1}>
              {children}
            </main>
            <footer>
              <span>
                Comparison calculations. Not tax invoices or payment requests.
              </span>
              <span>
                Production readiness requires a separate review. Pilot gates
                remain closed.
              </span>
              <a href="/THIRD-PARTY-NOTICES.txt">Third-party notices</a>
            </footer>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
