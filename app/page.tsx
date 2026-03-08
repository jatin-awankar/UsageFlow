import Architecture from "@/components/landing/Architecture";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import KeyFeatures from "@/components/landing/KeyFeatures";
import WhatIsUF from "@/components/landing/WhatIsUF";

export default function Home() {
  return (
    <>
      <Header />

      <main className="relative overflow-x-clip">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-136 bg-linear-to-b from-sky-100/70 via-cyan-50/50 to-transparent" />
        <div className="pointer-events-none absolute bottom-40 left-1/2 -z-10 h-64 w-[760px] -translate-x-1/2 rounded-full bg-sky-200/30 blur-3xl" />

        <section
          id="hero"
          className="px-4 pb-28 pt-24 sm:px-6 md:pb-36 md:pt-36 lg:px-8"
        >
          <HeroSection />
        </section>

        <section id="about" className="px-4 py-20 sm:px-6 lg:px-8">
          <WhatIsUF />
        </section>

        <section id="flow" className="px-4 py-20 sm:px-6 lg:px-8">
          <HowItWorks />
        </section>

        <section
          id="features"
          className="border-y border-slate-200/70 bg-white/70 px-4 py-20 backdrop-blur-sm sm:px-6 lg:px-8"
        >
          <KeyFeatures />
        </section>

        <section id="architecture" className="px-4 py-20 sm:px-6 lg:px-8">
          <Architecture />
        </section>

        <section id="cta" className="px-4 py-24 sm:px-6 lg:px-8">
          <CTA />
        </section>

        <Footer />
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "UsageFlow",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Web",
            description:
              "UsageFlow is a production-grade SaaS platform for usage-based billing and webhooks.",
            author: {
              "@type": "Person",
              name: "Jatin Awankar",
            },
          }),
        }}
      />
    </>
  );
}
