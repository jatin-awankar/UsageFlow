import Link from "next/link";
import { ArrowUpRight, Fingerprint } from "lucide-react";
export default function Landing() {
  return (
    <>
      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">Usage billing, made explainable</p>
          <h1>
            Every number
            <br />
            has a story.
          </h1>
          <p className="intro">
            Follow usage from an accepted event to a priced monthly
            BillingRecord. See the evidence behind every amount.
          </p>
          <Link className="primary hero-cta" href="/demo/">
            Explore the demo <ArrowUpRight size={20} aria-hidden="true" />
          </Link>
          <p className="small mt-4">Prepared workspace · No signup</p>
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
          <p className="eyebrow">The thread that connects it all</p>
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
              "An immutable usage fact. A stable identity for identical retries.",
            ],
            [
              "02",
              "Explain the amount",
              "The price at occurrence, rounded once for each event.",
            ],
            [
              "03",
              "Keep the evidence",
              "A reviewed monthly record with traceable delivery evidence.",
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
          <strong>Start with the prepared workspace.</strong> Quantity editing
          and source inspection are available. Acceptance, pricing, monthly
          review and delivery interactions are not implemented yet.
        </p>
        <p>How it works &amp; evidence — not available yet.</p>
        <a href="https://github.com/jatin-awankar/UsageFlow">
          Inspect the implementation{" "}
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </section>
    </>
  );
}
