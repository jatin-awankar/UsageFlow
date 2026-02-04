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

      <main className="flex flex-col">
        <section className="py-24 md:py-32">
          <HeroSection />
        </section>

        <section className="py-24 bg-muted">
          <WhatIsUF />
        </section>

        <section className="py-24">
          <HowItWorks />
        </section>

        <section className="py-24 bg-muted">
          <KeyFeatures />
        </section>

        <section className="py-24">
          <Architecture />
        </section>

        <section className="py-24 bg-muted">
          <CTA />
        </section>

        <section className="py-24">
          <Footer />
        </section>
      </main>
    </>
  );
}
