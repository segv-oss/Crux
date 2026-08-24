import React from "react";
import { Navbar } from "../components/Navbar";
import { MonochromeBackground } from "../components/MonochromeBackground";
import { Hero } from "../components/Hero";
import { InteractiveCockpit } from "../components/InteractiveCockpit";
import { FeatureGrid } from "../components/FeatureGrid";
import { HowItWorks } from "../components/HowItWorks";
import { IntegrationMatrix } from "../components/IntegrationMatrix";
import { ComparisonTable } from "../components/ComparisonTable";
import { CTABox } from "../components/CTABox";
import { Footer } from "../components/Footer";

export function LandingPage() {
  return (
    <main className="relative min-h-screen bg-[#0c0d10] text-[#f0f2f5] selection:bg-[#282d38] selection:text-white">
      <MonochromeBackground />
      <Navbar />
      <Hero />
      <InteractiveCockpit />
      <FeatureGrid />
      <HowItWorks />
      <IntegrationMatrix />
      <ComparisonTable />
      <CTABox />
      <Footer />
    </main>
  );
}
