import Link from "next/link";
import { ArrowUpRight, Fingerprint } from "lucide-react";
import { PilotContact } from "./pilot-contact";
import { pilotContact } from "./contact";
export default function Landing() {
  return (
    <>
      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">An engineering project by Jatin Awankar</p>
          <h1>
            Every number
            <br />
            has a story.
          </h1>
          <p className="intro">
            Usage billing gets hard when events are retried, prices change,
            or totals need explaining. UsageFlow connects each usage event
            to a traceable monthly billing calculation.
          </p>
          <Link className="primary hero-cta" href="/demo/">
            Try demo <ArrowUpRight size={20} aria-hidden="true" />
          </Link>
          <p className="small mt-4">Four guided chapters · No signup or setup</p>
          <p className="small">Browser simulation with synthetic data. No live billing or webhook requests.</p>
          <div className="recruiter-links">
            <a href="https://github.com/jatin-awankar/UsageFlow">View source code</a>
            <Link href="/evidence/">Engineering evidence</Link>
            <PilotContact destination={pilotContact} />
          </div>
        </div>
        <figure className="hero-figure">
          <div className="figure-top">
            <span>Orbit Studio</span>
            <span>Sep / 2026</span>
          </div>
          <p className="eyebrow">One event, explained</p>
          <div className="hero-number">
            1,250 <span>API calls</span>
          </div>
          <dl>
            <div className="figure-rule">
              <dt>Price at occurrence</dt>
              <dd>INR 0.0025</dd>
            </div>
            <div className="figure-rule">
              <dt>Exact product</dt>
              <dd>INR 3.125</dd>
            </div>
            <div className="figure-result">
              <dt>Rounded contribution</dt>
              <dd>INR 3.13</dd>
            </div>
          </dl>
          <div className="figure-caption">
            <Fingerprint size={25} aria-hidden="true" />
            <p>
              One stable identity.
              <br />
              Even when you send it twice.
            </p>
          </div>
          <figcaption>
            Illustrative rated outcome · Synthetic data
            <br />
            This example is not an accepted demo event.
          </figcaption>
        </figure>
      </section>
      <section className="landing-bottom">
        <div>
          <p className="eyebrow">Engineering decisions to explore</p>
          <h2>
            One customer. One month.
            <br />A calculation you can explain.
          </h2>
        </div>
        <div className="principles">
          {[
            [
              "01",
              "Accept once",
              "Keep an immutable ledger and deduplicate identical retries so the same usage is counted once.",
            ],
            [
              "02",
              "Explain the amount",
              "Select the price at occurrence time and use exact integer arithmetic to avoid floating-point money errors.",
            ],
            [
              "03",
              "Keep the evidence",
              "Separate acceptance, rating, owner approval and delivery so each outcome has its own evidence.",
            ],
          ].map(([number, title, copy]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="release-note">
        <p>
          <strong>Start with the prepared workspace.</strong> Explore simulated
          acceptance, pricing, monthly review, owner finalization and delivery
          with traceable synthetic evidence.
        </p>
        <p>
          <Link href="/evidence/">How it works &amp; evidence</Link>
        </p>
        <a href="https://github.com/jatin-awankar/UsageFlow">
          Inspect the implementation{" "}
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </section>
    </>
  );
}
